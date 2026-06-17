import logging
import os

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
def download_and_segment(self, movie_id):
    try:
        movie   = Movie.objects.get(id=movie_id)
        torrent = Torrent.objects.get(movie=movie)

        movie_dir = f'{DOWNLOAD_DIR}/{movie_id}'
        hls_dir   = f'{HLS_DIR}/{movie_id}'
        os.makedirs(movie_dir, exist_ok=True)
        os.makedirs(hls_dir,   exist_ok=True)

        if movie_id not in ACTIVE_TORRENTS:
            # if torrent.status == 'ready' and torrent.hls_path and os.path.exists(torrent.hls_path):
            #     logger.info('[Download] Already ready | movie_id=%s hls=%s', movie_id, torrent.hls_path)
            #     # enqueue_subtitle_preparation_once(movie_id, video_path=torrent.video_path)
            #     return

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

        torrent.refresh_from_db()
        ffmpeg_started = torrent.status in ('processing', 'ready')

        if not ffmpeg_started:
            video_file = _find_video_file(movie_dir)
            if video_file:
                torrent.video_path = video_file
                torrent.save(update_fields=['video_path'])

                # updated 99.5 
                if progress >= 5 or status.is_seeding:
                    moov_ok, v_codec, a_codec = _pre_check_video(video_file)
                    if moov_ok:
                        logger.info('[Download] Starting FFmpeg | movie_id=%s codecs=%s/%s', movie_id, v_codec, a_codec)
                        start_ffmpeg(video_file, hls_dir, movie_id, torrent, _get_ffmpeg_args(v_codec, a_codec))

                    else:
                        logger.info('[Download] Video metadata not readable yet | movie_id=%s', movie_id)
                else:
                    logger.info('[Download] Waiting for full download | movie_id=%s progress=%.1f%%', movie_id, progress)
            else:
                logger.info('[Download] Video file not found yet | movie_id=%s', movie_id)

        torrent.refresh_from_db()
        if status.is_seeding or progress >= 100.0:
            logger.info('[Download] Complete | movie_id=%s', movie_id)
            # enqueue_subtitle_preparation_once(movie_id, video_path=torrent.video_path)
            return

        self.apply_async(args=[movie_id], countdown=3)

    except Movie.DoesNotExist:
        logger.error('[Download] Movie not found | movie_id=%s', movie_id)
    except Torrent.DoesNotExist:
        logger.error('[Download] Torrent not found | movie_id=%s', movie_id)
    except Exception:
        logger.exception('[Download] Unexpected error | movie_id=%s', movie_id)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _find_video_file(directory) -> str | None:
    VIDEO_EXTENSIONS = ('.mkv', '.mp4', '.avi', '.webm', '.divx', '.mov', '.flv', '.wmv', '.m4v', '.mpg', '.mpeg')
    for root, _, files in os.walk(directory):
        for f in files:
            if f.lower().endswith(VIDEO_EXTENSIONS):
                return os.path.join(root, f)
    return None


def _pre_check_video(file_path) -> tuple[bool, str | None, str | None]:
    import json
    import subprocess

    moov_available = False
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', file_path],
            capture_output=True, timeout=2,
        )
        moov_available = result.returncode == 0
    except Exception:
        pass

    video_codec = audio_codec = None
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,codec_type', '-of', 'json', file_path],
            capture_output=True, text=True, timeout=2,
        )
        for stream in json.loads(result.stdout).get('streams', []):
            if stream.get('codec_type') == 'video':
                video_codec = stream.get('codec_name')
            elif stream.get('codec_type') == 'audio':
                audio_codec = stream.get('codec_name')
    except Exception:
        pass

    return moov_available, video_codec, audio_codec


def _get_ffmpeg_args(video_codec, audio_codec) -> list[str]:
    if video_codec == 'h264' and audio_codec == 'aac':
        return ['-c:v', 'copy', '-c:a', 'copy']
    if video_codec in ('h264', 'h265'):
        return ['-c:v', 'libx264', '-c:a', 'copy']
    return ['-c:v', 'libx264', '-c:a', 'aac']
