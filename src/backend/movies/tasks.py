import os
import time
import threading
import subprocess
import requests
from backend.movies.streaming import build_ffmpeg_hls_command
import libtorrent as lt
import shutil

from celery import shared_task
from django.db import connection
from movies.models import Movie
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

DOWNLOAD_DIR  = '/tmp/torrents'
HLS_DIR       = '/media/hls'
MIN_BUFFER    = 5        # % before starting FFmpeg
active_ffmpeg = {}

####### HELPER ######

def prioritize_best_video_file(handle, info):
    """
    Prioritize the best video file inside the torrent.

    Priority order:
    .mp4 > .mkv > .webm > .avi > .divx

    All other files are ignored.
    """

    files = info.files()

    best_index = None
    best_score = -1

    # Extension priority scores
    EXTENSION_SCORES = {
        '.mp4': 100,
        '.mkv': 90,
        '.webm': 80,
        '.avi': 70,
        '.divx': 60,
        '.mov': 50,
        '.mpeg': 40,
        '.mpg': 40,
    }

    # Find best file
    for i in range(files.num_files()):
        path = files.file_path(i).lower()

        score = -1

        for ext, ext_score in EXTENSION_SCORES.items():
            if path.endswith(ext):
                score = ext_score
                break

        print(f'[TORRENT FILE] {i} -> {path} | score={score}')

        if score > best_score:
            best_score = score
            best_index = i

    # No valid video found
    if best_index is None:
        print('[Torrent] No valid video file found ❌')
        return None

    # Set all files to ignored
    priorities = [0] * files.num_files()

    # Highest priority for best file
    priorities[best_index] = 7

    # Apply priorities
    handle.prioritize_files(priorities)

    selected_file = files.file_path(best_index)

    print(f'[Torrent] Selected file ✅ {selected_file}')
    print(f'[Torrent] Applied priorities ✅')

    return selected_file

@shared_task
def download_and_segment(movie_id):
    """
    1. Start torrent download
    2. Wait for MIN_BUFFER % downloaded
    3. Start FFmpeg conversion in background thread
    4. Keep downloading while FFmpeg converts
    5. When fully downloaded → save file
    """
    connection.close()

    try:
        movie = Movie.objects.get(id=movie_id)

        # ─────────────────────────────────────────
        # Prevent duplicate tasks
        # ─────────────────────────────────────────
        if movie.status in ['downloading', 'processing']:
            print(f'[{movie.title}] Task already running ✅')
            return

        movie_dir = f'{DOWNLOAD_DIR}/{movie_id}'
        hls_dir   = f'{HLS_DIR}/{movie_id}'
        os.makedirs(movie_dir, exist_ok=True)
        os.makedirs(hls_dir,   exist_ok=True)

        # ─────────────────────────────────────────
        # File already downloaded → skip torrent
        # ─────────────────────────────────────────
        existing_file = _find_video_file(movie_dir)
        if existing_file:
            print(f'[{movie.title}] File exists → skip download ✅')
            movie.movie_path = existing_file
            movie.status   = 'processing'
            movie.save()
            
            _start_ffmpeg(existing_file, hls_dir, movie_id, movie)
            return

        # ─────────────────────────────────────────
        # Start torrent download
        # ─────────────────────────────────────────
        movie.status = 'downloading'
        movie.save()

        session = lt.session({'listen_interfaces': '0.0.0.0:6881', 'enable_dht': True ,
                              'enable_lsd': True,      # ← replaces start_lsd()
                            'enable_upnp': True,     # ← replaces start_upnp()
                            'enable_natpmp': True,})
        session.add_dht_router('router.bittorrent.com', 6881)
        session.add_dht_router('router.utorrent.com', 6881)
        session.add_dht_router('dht.transmissionbt.com', 6881)
        session.add_dht_router('dht.aiobt.com', 6881)
        session.add_dht_router('dht.libtorrent.org', 25401)  # ← add this
        session.start_dht()
        session.start_lsd()
        session.start_upnp()

        params = {
            'save_path': movie_dir,
            'storage_mode': lt.storage_mode_t.storage_mode_sparse
        }

        # Add torrent — magnet or .torrent file
        if movie.torrent_url.startswith('magnet:'):
            handle = lt.add_magnet_uri(session, movie.torrent_url, params)
            print(f'[{movie.title}] Waiting for metadata...')
            start = time.time()
            while not handle.has_metadata():
                if time.time() - start > 60:
                    raise Exception('Metadata timeout')
                time.sleep(1)
            info = handle.get_torrent_info()
        else:
            response = requests.get(movie.torrent_url, timeout=10)
            response.raise_for_status()
            info   = lt.torrent_info(lt.bdecode(response.content))
            handle = session.add_torrent({**params, 'ti': info})

        # Sequential download for streaming
        handle.set_sequential_download(True)
        handle.force_reannounce()
        handle.force_dht_announce()

        prioritize_best_video_file(handle, info)

        total_pieces = info.num_pieces()
        print(f'[{movie.title}] Total pieces: {total_pieces}')
    
        # ─────────────────────────────────────────
        # Wait for peers
        # ─────────────────────────────────────────
        _wait_for_peers(handle, movie)

        # ─────────────────────────────────────────
        # Download loop:
        # - Wait for MIN_BUFFER %
        # - Start FFmpeg in background
        # - Keep downloading
        # ─────────────────────────────────────────
        ffmpeg_started = False

        while True:
            s        = handle.status()
            progress = s.progress * 100

            print(
                f'[{movie.title}] '
                f'{progress:.1f}% | '
                f'{s.download_rate / 1000:.1f} KB/s | '
                f'peers: {s.num_peers}'
            )

            # ✅ Enough data — start FFmpeg
            if not ffmpeg_started and progress >= MIN_BUFFER:
                print(f'[{movie.title}] {MIN_BUFFER}% reached → starting FFmpeg ✅')

                video_file = _wait_for_file(movie_dir)
                movie.movie_path = video_file
                movie.status   = 'processing'
                ffmpeg_started = True
                movie.save()

                # ✅ Start FFmpeg in background — non-blocking
                ffmpeg_thread = threading.Thread(
                    target=_start_ffmpeg,
                    args=(video_file, hls_dir, movie_id, movie)
                )
                ffmpeg_thread.daemon = True
                ffmpeg_thread.start()

                ffmpeg_started = True

            # ✅ Fully downloaded
            if s.is_seeding:
                print(f'[{movie.title}] Download complete ✅')

                # Update status if FFmpeg not started yet
                if not ffmpeg_started:
                    video_file = _find_video_file(movie_dir)
                    if video_file:
                        movie.movie_path = video_file
                        movie.status   = 'processing'
                        movie.save()

                        _start_ffmpeg(video_file, hls_dir, movie_id, movie)

                break

            time.sleep(2)

    except Exception as e:
        print(f'[ERROR] movie {movie_id}: {e}')
        try:
            movie = Movie.objects.get(id=movie_id)
            movie.status = 'error'
            movie.save()
            # _notify_status(movie_id=movie_id, status='error')
        except Exception:
            pass


# ──────────────────────────────────────────
# START FFMPEG — NON BLOCKING
# ──────────────────────────────────────────
def _start_ffmpeg(video_file, hls_dir, movie_id, movie):
    """
    Start FFmpeg conversion in background.
    Notifies frontend when first segments are ready.
    """
    connection.close()

    hls_output = f'{hls_dir}/output.m3u8'

    # Kill old FFmpeg if running
    if movie_id in active_ffmpeg:
        try:
            active_ffmpeg[movie_id].kill()
            print(f'[FFmpeg] Killed old process for movie {movie_id}')
        except Exception:
            pass
        active_ffmpeg.pop(movie_id, None)

    # Clean old segments
    # _clean_segments(hls_dir)

    print(f'[FFmpeg] Starting conversion for movie {movie_id}...')
    print(f'[FFmpeg] Input:  {video_file}')
    print(f'[FFmpeg] Output: {hls_output}')

    try:
        # process = subprocess.Popen([
        #     'ffmpeg', '-y',
        #     '-fflags', '+genpts+igndts',
        #     # '-re',
        #     '-i', video_file,
        #     # '-c:v', 'libx264',
        #     # '-c:a', 'aac',
        #     '-c', 'copy',
        #     '-preset', 'veryfast',
        #     '-f', 'hls',
        #     '-hls_time', '4',
        #     '-hls_list_size', '0',
        #     '-hls_playlist_type', 'event',
        #     '-hls_segment_filename', f'{hls_dir}/output%d.ts',
        #     '-hls_flags', 'independent_segments',
        #     hls_output
        # ])
        ffmpeg_cmd = build_ffmpeg_hls_command(video_file, hls_dir, hls_output)
        process = subprocess.Popen(ffmpeg_cmd)

        active_ffmpeg[movie_id] = process
        print(f'[FFmpeg] PID={process.pid} ✅')

        # ✅ Wait for first 3 segments → notify frontend
        _wait_for_segments(hls_dir, min_segments=3)

        movie     = Movie.objects.get(id=movie_id)
        movie.hls_path = hls_output
        movie.status   = 'ready'
        movie.save()

        # _notify_status(
        #     movie_id=movie_id,
        #     status='ready',
        #     hls_path=hls_output
        # )
        print(f'[FFmpeg] Streaming started ✅')

        # Monitor FFmpeg in background
        def monitor():
            code = process.wait()
            print(f'[FFmpeg] Finished with code {code}')
            active_ffmpeg.pop(movie_id, None)

        threading.Thread(target=monitor, daemon=True).start()

    except Exception as e:
        print(f'[FFmpeg ERROR] {e}')
        try:
            movie     = Movie.objects.get(id=movie_id)
            movie.status = 'error'
            movie.save()
            # _notify_status(movie_id=movie_id, status='error')
        except Exception:
            pass


# ──────────────────────────────────────────
# CLEANUP TASKS
# ──────────────────────────────────────────
# @shared_task
# def cleanup_segments(movie_id):
#     """Delete segments after watching — keep .mkv"""
#     from django.utils import timezone

#     hls_dir = f'{HLS_DIR}/{movie_id}'
#     _clean_segments(hls_dir)

#     Movie.objects.filter(id=movie_id).update(
#         hls_path=None,
#         last_watched=timezone.now()
#     )
#     print(f'[Cleanup] Segments deleted for movie {movie_id} ✅')


@shared_task
def cleanup_old_movies():
    """Delete .mkv after 1 month unwatched"""
    from django.utils import timezone
    from datetime import timedelta

    one_month_ago = timezone.now() - timedelta(days=30)

    old_movies = Movie.objects.filter(
        last_watched__lt=one_month_ago,
        mkv_path__isnull=False
    )

    for movie in old_movies:
        movie_dir = f'{DOWNLOAD_DIR}/{movie.id}'
        hls_dir   = f'{HLS_DIR}/{movie.id}'

        for folder in [movie_dir, hls_dir]:
            if os.path.exists(folder):
                shutil.rmtree(folder)
                print(f'[Cleanup] Deleted {folder} ✅')

        movie.status       = 'downloading'
        movie.mkv_path     = None
        movie.hls_path     = None
        movie.last_watched = None
        movie.save()
        print(f'[Cleanup] Reset: {movie.title} ✅')


# ──────────────────────────────────────────
# HELPER FUNCTIONS
# ──────────────────────────────────────────
def _wait_for_peers(handle, movie, timeout=60):
    print(f'[{movie.title}] Waiting for peers...')
    start = time.time()
    while True:
        s = handle.status()
        print(f'[{movie.title}] peers: {s.num_peers} | seeds: {s.num_seeds}')
        if s.num_peers > 0:
            print(f'[{movie.title}] Peers found ✅')
            return
        if time.time() - start > timeout:
            raise Exception('No peers found after 60s')
        time.sleep(3)


def _wait_for_file(directory, timeout=120):
    print(f'[Torrent] Waiting for file in {directory}...')
    start = time.time()
    while True:
        f = _find_video_file(directory)
        if f:
            print(f'[Torrent] File found: {f} ✅')
            return f
        if time.time() - start > timeout:
            raise Exception('File not found after timeout')
        time.sleep(2)


def _find_video_file(directory):
    VIDEO_EXTENSIONS = (
        '.mkv', '.mp4', '.avi', '.webm',
        '.divx', '.mov', '.flv', '.wmv',
        '.m4v', '.mpg', '.mpeg'
    )
    for root, dirs, files in os.walk(directory):
        for f in files:
            if f.lower().endswith(VIDEO_EXTENSIONS):
                full_path = os.path.join(root, f)
                print(f'✅ Found: {full_path}')
                return full_path
    return None


def _wait_for_segments(hls_dir, min_segments=3, timeout=120):
    print(f'[FFmpeg] Waiting for {min_segments} segments...')
    start = time.time()
    while True:
        if os.path.exists(hls_dir):
            segments = [
                f for f in os.listdir(hls_dir)
                if f.endswith('.ts')
            ]
            print(f'[FFmpeg] Segments: {len(segments)}')
            if len(segments) >= min_segments:
                print(f'[FFmpeg] {min_segments} segments ready ✅')
                return
        if time.time() - start > timeout:
            raise Exception('FFmpeg timeout')
        time.sleep(2)


# def _clean_segments(hls_dir):
#     if os.path.exists(hls_dir):
#         for f in os.listdir(hls_dir):
#             try:
#                 os.remove(os.path.join(hls_dir, f))
#             except Exception as e:
#                 print(f'[Cleanup] Could not delete {f}: {e}')
#     else:
#         os.makedirs(hls_dir, exist_ok=True)
#     print(f'[Cleanup] Cleaned {hls_dir} ✅')

