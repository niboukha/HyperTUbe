import os
import subprocess
import time
import threading
from .torrent_engine import download_torrent, ACTIVE_TORRENTS
import libtorrent as lt
import shutil
from .hls import _start_ffmpeg

from celery import shared_task
from django.db import connection
from movies.models import Movie


DOWNLOAD_DIR  = '/tmp/torrents'
HLS_DIR       = '/media/hls'
MIN_BUFFER    = 5        # % before starting FFmpeg
# active_ffmpeg = {}
# TORRENT_SESSION = {}
# TORRENT_HANDELS = {}

    
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

        movie_dir = f'{DOWNLOAD_DIR}/{movie_id}'
        hls_dir   = f'{HLS_DIR}/{movie_id}'

        os.makedirs(movie_dir, exist_ok=True)
        os.makedirs(hls_dir,   exist_ok=True)

        handle = download_torrent(movie_dir, movie)
        # ─────────────────────────────────────────
        # Download loop:
        # - Wait for MIN_BUFFER %
        # - Start FFmpeg in background
        # - Keep downloading
        # ─────────────────────────────────────────
        ffmpeg_started = False  

        while True:
            s        = ACTIVE_TORRENTS[movie_id]['handle'].status()
            progress = s.progress * 100

            print(
                f'[{movie.title}] '
                f'{progress:.1f}% | '
                f'{s.download_rate / 1000:.1f} KB/s | '
                f'peers: {s.num_peers}'
            )
            # fp = handle.file_progress()
            # ✅ Enough data — start FFmpeg
            video_file = _find_video_file(movie_dir)
            if not ffmpeg_started and video_file:
                print(f'====> [{movie.title}] {MIN_BUFFER}% reached → starting FFmpeg ✅')
                # video_file = _wait_for_file(movie_dir)
                movie.movie_path = video_file
                movie.status   = 'processing'
                movie.save()
                ffmpeg_started = True

                # ✅ Start FFmpeg in background — non-blocking
                # ffmpeg_thread = threading.Thread(
                #     target=_start_ffmpeg,
                #     args=(video_file, hls_dir, movie_id, movie)
                # )
                # ffmpeg_thread.daemon = True
                # ffmpeg_thread.start()
                _start_ffmpeg(video_file, hls_dir, movie_id, movie)

                ffmpeg_started = True
                # break

            # ✅ Fully downloaded
            if s.is_seeding or progress >= 100.0:
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
        movie.status = 'error'
        movie.save()




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


# @shared_task
# def cleanup_old_movies():
#     """Delete .mkv after 1 month unwatched"""
#     from django.utils import timezone
#     from datetime import timedelta

#     one_month_ago = timezone.now() - timedelta(days=30)

#     old_movies = Movie.objects.filter(
#         last_watched__lt=one_month_ago,
#         mkv_path__isnull=False
#     )

#     for movie in old_movies:
#         movie_dir = f'{DOWNLOAD_DIR}/{movie.id}'
#         hls_dir   = f'{HLS_DIR}/{movie.id}'

#         for folder in [movie_dir, hls_dir]:
#             if os.path.exists(folder):
#                 shutil.rmtree(folder)
#                 print(f'[Cleanup] Deleted {folder} ✅')

#         movie.status       = 'downloading'
#         movie.mkv_path     = None
#         movie.hls_path     = None
#         movie.last_watched = None
#         movie.save()
#         print(f'[Cleanup] Reset: {movie.title} ✅')


# ──────────────────────────────────────────
# HELPER FUNCTIONS
# ──────────────────────────────────────────



# def _wait_for_file(directory, timeout=120):
#     print(f'[Torrent] Waiting for file in {directory}...')
#     start = time.time()
#     while True:
#         f = _find_video_file(directory)
#         if f:
#             print(f'[Torrent] File found: {f} ✅')
#             return f
#         if time.time() - start > timeout:
#             raise Exception('File not found after timeout')
#         time.sleep(2)


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
                print(f'=============== ✅ Found: {full_path}')
                # time.sleep(3)  # Ensure file is fully written
                return full_path
    return None




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

