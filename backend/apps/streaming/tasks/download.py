import json
import logging
import os
import subprocess
import urllib.parse
import libtorrent as lt

from celery import shared_task
from django.conf import settings

from apps.movies.models import Movie
from apps.streaming.models import Torrent
from apps.streaming.torrent_engine import download_torrent, ACTIVE_TORRENTS
from apps.streaming.hls import start_ffmpeg
from .subtitles import enqueue_subtitle_preparation_once

logger = logging.getLogger(__name__)

DOWNLOAD_DIR = settings.TORRENT_DOWNLOAD_ROOT
HLS_DIR      = settings.HLS_ROOT


@shared_task(bind=True)
def download_and_segment(self, movie_id, stuck_ticks=0):
    try:
        movie   = Movie.objects.get(id=movie_id)
        torrent = Torrent.objects.get(movie=movie)

        movie_dir = f'{DOWNLOAD_DIR}/{movie_id}'
        hls_dir   = f'{HLS_DIR}/{movie_id}'

        os.makedirs(movie_dir, exist_ok=True)
        os.makedirs(hls_dir,   exist_ok=True)

        if movie_id not in ACTIVE_TORRENTS:
            logger.info('[Download] Starting torrent | movie_id=%s previous_status=%s', movie_id, torrent.status)
            torrent.status   = 'downloading'
            torrent.hls_path = None
            if torrent.video_path and not os.path.exists(torrent.video_path):
                torrent.video_path = None
            torrent.save(update_fields=['status', 'hls_path', 'video_path'])
            download_torrent(movie_dir, torrent)

        if movie_id not in ACTIVE_TORRENTS:
            logger.warning('[Download] download_torrent did not register torrent | movie_id=%s', movie_id)
            return

        handle   = ACTIVE_TORRENTS[movie_id]['handle']
        status   = handle.status()
        progress = status.progress * 100
        logger.info('[Download] Progress | movie_id=%s progress=%.1f%% peers=%d', movie_id, progress, status.num_peers)

        # ─────────────────────────────────────────────────────────
        # 1. DEAD TORRENT TIMEOUT (Handles staying at 0%)
        # ─────────────────────────────────────────────────────────
        if status.num_peers == 0 and progress < 10.0:
            stuck_ticks += 1
            if stuck_ticks > 200:  # 200 ticks * 3 seconds = ~10 minutes
                logger.error('[Download] Torrent DEAD (0 peers for 10 mins) | movie_id=%s', movie_id)
                torrent.status = 'error'
                torrent.save(update_fields=['status'])
                
                # Cleanup memory
                if movie_id in ACTIVE_TORRENTS:
                    del ACTIVE_TORRENTS[movie_id]
                    
                return  # Exit Celery task permanently
        else:
            stuck_ticks = 0  # Reset if we find peers or make progress
        # ─────────────────────────────────────────────────────────

        torrent.refresh_from_db()
        ffmpeg_started = torrent.status in ('processing', 'ready')

        if not ffmpeg_started:
            video_file = _find_video_file(movie_dir)
            if video_file:
                torrent.video_path = video_file
                torrent.save(update_fields=['video_path'])

                # Measure contiguous downloaded data from the start of the file
                sequential_mb = get_sequential_coverage_mb(handle, video_file)
                moov_ok, v_codec, a_codec = pre_check_video(video_file)

                # ─────────────────────────────────────────────────────────
                # STREAM-WHILE-DOWNLOADING TRIGGER
                # ─────────────────────────────────────────────────────────
                enough_data = (sequential_mb >= 10.0 and moov_ok) or status.is_seeding or progress >= 99.5

                if enough_data:
                    # ─────────────────────────────────────────────────────────
                    # 2. HTTP FALLBACK LOGIC (Handles MP4 Trap at 99.8%)
                    # ─────────────────────────────────────────────────────────
                    if not moov_ok and status.num_peers == 0 and 'archive.org/download/' in torrent.movie.torrent_url:
                        logger.info('[Download] Local file unreadable (stuck at %.1f%%). Attempting HTTP fallback...', progress)
                        
                        archive_id = torrent.movie.torrent_url.split('archive.org/download/')[1].split('/')[0]
                        
                        # Fix: Just use the raw filename, ignoring libtorrent's local folder
                        filename = os.path.basename(video_file)
                        filename_encoded = urllib.parse.quote(filename)
                        
                        # Construct the exact URL Archive.org expects
                        http_url = f"https://archive.org/download/{archive_id}/{filename_encoded}"
                        
                        logger.info('[Download] Testing fallback URL: %s', http_url)
                        fallback_moov, fallback_v, fallback_a = pre_check_video(http_url)
                        
                        if fallback_moov:
                            logger.info('[Download] HTTP fallback successful! Overriding local file.')
                            moov_ok = True
                            v_codec = fallback_v
                            a_codec = fallback_a
                            video_file = http_url  # Point FFmpeg to the web URL
                    # ─────────────────────────────────────────────────────────
                    if moov_ok:
                        logger.info('[Download] Starting FFmpeg | movie_id=%s codecs=%s/%s', movie_id, v_codec, a_codec)
                        # Check if the torrent is fully downloaded or seeding
                        is_fully_downloaded = status.is_seeding or progress >= 99.5
                        
                        start_ffmpeg(
                            video_file, 
                            hls_dir, 
                            movie_id, 
                            torrent, 
                            get_ffmpeg_args(v_codec, a_codec), 
                            is_complete=is_fully_downloaded
                        )
                        # start_ffmpeg(video_file, hls_dir, movie_id, torrent, get_ffmpeg_args(v_codec, a_codec))
                    else:
                        logger.info('[Download] Video metadata not readable yet | movie_id=%s', movie_id)
                else:
                    logger.info('[Download] Waiting for data | movie_id=%s progress=%.1f%% sequential_mb=%.1f moov_ok=%s', movie_id, progress, sequential_mb, moov_ok)
            else:
                logger.info('[Download] Video file not found yet | movie_id=%s', movie_id)

        torrent.refresh_from_db()
        if status.is_seeding or progress >= 100.0:
            logger.info('[Download] Complete | movie_id=%s', movie_id)
            return

        # Pass the stuck_ticks counter back to the next iteration
        self.apply_async(args=[movie_id], kwargs={'stuck_ticks': stuck_ticks}, countdown=3)

    except Movie.DoesNotExist:
        logger.error('[Download] Movie not found | movie_id=%s', movie_id)
    except Torrent.DoesNotExist:
        logger.error('[Download] Torrent not found | movie_id=%s', movie_id)
    except Exception:
        logger.exception('[Download] Unexpected error | movie_id=%s', movie_id)


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_sequential_coverage_mb(handle, video_file_path):
    """
    Accurately count contiguous MB downloaded using libtorrent's piece map.
    This replaces checking empty space on the OS, preventing premature FFmpeg crashes.
    """
    try:
        QUERY_PIECES = getattr(lt.torrent_handle, 'query_pieces', getattr(lt.status_flags_t, 'query_pieces', 4))
        pieces = handle.status(QUERY_PIECES).pieces
        if not pieces:
            return 0.0

        info = handle.get_torrent_info()
        piece_length = info.piece_length()
        files = info.files()
        
        video_idx = -1
        for i in range(files.num_files()):
            lt_path = files.file_path(i).replace('\\', '/')
            os_path = video_file_path.replace('\\', '/')
            if os_path.endswith(lt_path):
                video_idx = i
                break
        
        if video_idx == -1:
            return 0.0

        file_offset = files.file_offset(video_idx)
        file_size = files.file_size(video_idx)
        first_piece = int(file_offset // piece_length)
        last_piece = int((file_offset + file_size - 1) // piece_length)

        count = 0
        for i in range(first_piece, last_piece + 1):
            if not pieces[i]:
                break
            count += 1

        return (count * piece_length) / (1024 * 1024)
    except Exception as e:
        logger.error(f"[Download] Sequential coverage error: {e}")
        return 0.0


def _find_video_file(directory):
    VIDEO_EXTENSIONS = (
        '.mkv', '.mp4', '.avi', '.webm',
        '.divx', '.mov', '.flv', '.wmv',
        '.m4v', '.mpg', '.mpeg',
    )
    for root, _, files in os.walk(directory):
        for f in files:
            if f.lower().endswith(VIDEO_EXTENSIONS):
                full_path = os.path.join(root, f)
                return full_path
    return None


def pre_check_video(file_path):
    # Give it 15 seconds if reading from Archive.org, otherwise keep it at 2 seconds
    is_remote = file_path.startswith('http')
    probe_timeout = 15 if is_remote else 2
    
    moov_available = False
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', file_path],
            capture_output=True,
            timeout=probe_timeout,
        )
        moov_available = result.returncode == 0
    except Exception as e:
        if is_remote:
            logger.warning(f"[FFprobe] Duration check timed out on remote URL: {e}")
        pass

    video_codec = None
    audio_codec = None
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,codec_type',
             '-of', 'json', file_path],
            capture_output=True, text=True, timeout=probe_timeout,
        )
        data = json.loads(result.stdout)
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'video':
                video_codec = stream.get('codec_name')
            elif stream.get('codec_type') == 'audio':
                audio_codec = stream.get('codec_name')
    except Exception as e:
        if is_remote:
            logger.warning(f"[FFprobe] Codec check timed out on remote URL: {e}")
        pass

    return moov_available, video_codec, audio_codec


def get_ffmpeg_args(video_codec, audio_codec):
    if video_codec == 'h264' and audio_codec == 'aac':
        return ['-c:v', 'copy', '-c:a', 'copy']
    elif video_codec in ('h264', 'h265'):
        return ['-c:v', 'libx264', '-c:a', 'copy']
    else:
        return ['-c:v', 'libx264', '-c:a', 'aac']