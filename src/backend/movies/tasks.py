from celery import shared_task
from django.conf import settings
from .models import Movie
from . import hls
import os
import requests

CHUNK_SIZE = 1024 * 1024        # 1MB
MIN_BUFFER = 50 * 1024 * 1024  # 50MB before first HLS generation
REQUEST_TIMEOUT = 300


def get_movie_dir(movie_id):
    return os.path.join('/media/movies/', str(movie_id))


@shared_task
def download_and_segment(movie_id):
    """
    Main Celery task:
    1. Download file in chunks
    2. Once 50MB downloaded → start generating HLS segments
    3. Keep downloading + re-generating segments as more data arrives
    4. When fully downloaded → generate final complete HLS
    
    Multiple users watching same movie:
    → Only ONE task runs (check status before starting)
    → All users read from same playlist/segments
    """
    try:
        movie = Movie.objects.get(id=movie_id)

        # Prevent duplicate tasks
        if movie.status in ['downloading', 'converting', 'ready']:
            print(f"Task already running or complete for movie {movie_id}")
            return

        # movie_dir = get_movie_dir(movie_id)
        os.makedirs('/media/movies/' + str(movie_id), exist_ok=True)


        movie.status = 'downloading'

        movie.save(update_fields=['status'])

        # Determine file extension from torrent
        from .hls import generate_hls_from_partial, generate_hls_from_file
        import libtorrent as lt
        import time

        torrent_url = movie.torrent_url

        # Get file extension
        session = lt.session({
            'listen_interfaces': '0.0.0.0:6881'
        })

        params = {
            'save_path': '/media/movies/' + str(movie_id),
            'storage_mode': lt.storage_mode_t.storage_mode_sparse,
        }

        # =====================================================
        # MAGNET LINK
        # =====================================================
        if torrent_url.startswith("magnet:"):
            handle = lt.add_magnet_uri(session, torrent_url, params)

            print("Waiting metadata...")

            while not handle.has_metadata():
                time.sleep(1)

            info = handle.get_torrent_info()

        # =====================================================
        # .TORRENT FILE URL
        # =====================================================
        else:
            print(f"===========> Downloading torrent file for movie {movie_id} from {torrent_url}")
            response = requests.get(torrent_url, stream=True, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()

            info = lt.torrent_info(
                lt.bdecode(response.content)
            )

            handle = session.add_torrent({
                **params,
                'ti': info
            })

        handle.set_sequential_download(True)  # Force sequential download for better streaming
        # total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        first_hls_generated = False

        print(f"Downloading movie {movie_id}: {total_size / 1024 / 1024:.2f} MB")

        while True:
            s = handle.status()
            # downloaded = s.total_done
            progress = s.progress * 100
            print(f"Download progress for movie {movie_id}: {progress:.2f}%")

            # Generate HLS once we have enough buffer
            if progress >= MIN_BUFFER:
                print(f"=============> Buffer reached for movie {movie_id}, generating initial HLS")
                hls_path =  generate_hls_from_partial(movie_id, downloaded)
                # first_hls_generated = True
                movie.hls_path = hls_path
                movie.status = 'ready'
                movie.save(update_fields=['hls_path', 'status'])
                break
            # If fully downloaded, generate final HLS and exit loop
            if s.is_seeding:
                print(f"Download complete for movie {movie_id}, generating final HLS")
                generate_hls_from_file(movie_id, movie.movie_path)
                break

            time.sleep(5)

        return hls_path
        # convert_and_segment.delay(movie_id, movie.movie_path)

    except Exception as e:
        print(f"Task error for movie {movie_id}: {e}")
        try:
            movie = Movie.objects.get(id=movie_id)
            movie.status = 'error'
            movie.save(update_fields=['status'])
        except:
            pass
        raise


@shared_task
def convert_and_segment(movie_id, mkv_path):
    """
    Celery task:
    1. Convert MKV → MP4
    2. Generate HLS segments from MP4
    """
    try:
        import subprocess

        movie = Movie.objects.get(id=movie_id)
        mp4_path = mkv_path.replace('.mkv', '.mp4')

        print(f"Converting MKV to MP4 for movie {movie_id}")

        cmd = [
            'ffmpeg',
            '-i', mkv_path,
            '-c:v', 'copy',
            '-c:a', 'copy',
            '-f', 'mp4',
            mp4_path
        ]

        subprocess.run(cmd, capture_output=True, timeout=3600, check=True)

        print(f"Conversion complete, generating HLS for movie {movie_id}")

        # Update DB to point to MP4
        movie.movie_path = mp4_path
        movie.status = 'ready'
        movie.save(update_fields=['movie_path', 'status'])

        # Generate full HLS from converted MP4
        hls.generate_hls_from_file(movie_id, mp4_path)

    except Exception as e:
        print(f"Convert task error for movie {movie_id}: {e}")
        try:
            movie = Movie.objects.get(id=movie_id)
            movie.status = 'error'
            movie.save(update_fields=['status'])
        except:
            pass
        raise


@shared_task
def cleanup_old_hls(movie_id):
    """
    Cleanup HLS segments for a movie
    Called after movie unwatched for 30 days
    """
    hls.cleanup_hls_dir(movie_id)
    print(f"Cleaned up HLS for movie {movie_id}")