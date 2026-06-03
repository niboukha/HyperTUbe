import os
from celery import shared_task
from .models import  Torrent
from apps.movies.models import Movie
from .torrent_engine import download_torrent, ACTIVE_TORRENTS
import libtorrent as lt
from .hls import start_ffmpeg
import os
from django.db import close_old_connections, connection
import subprocess




DOWNLOAD_DIR  = '/tmp/torrents'
HLS_DIR       = '/media/hls'
MIN_BUFFER    = 5     

@shared_task(bind=True)
def download_and_segment(self, movie_id):
    try:
        movie     = Movie.objects.get(id=movie_id)
        torrent   = Torrent.objects.get(movie=movie)
        movie_dir = f'{DOWNLOAD_DIR}/{movie_id}'
        hls_dir   = f'{HLS_DIR}/{movie_id}'

        os.makedirs(movie_dir, exist_ok=True)
        os.makedirs(hls_dir,   exist_ok=True)

        # Guard: only start download once, use DB as source of truth
        if movie_id not in ACTIVE_TORRENTS:
            if torrent.status in ('downloading', 'processing', 'ready'):
                print(f'[{movie_id}] Already started, but not in ACTIVE_TORRENTS (worker restart?). Re-adding...')
            else:
                torrent.status = 'downloading'
                torrent.save()
                download_torrent(movie_dir, torrent)

        if movie_id not in ACTIVE_TORRENTS:
            print(f'[{movie_id}] download_torrent did not populate ACTIVE_TORRENTS!')
            return  # stop re-queuing, something is wrong

        s        = ACTIVE_TORRENTS[movie_id]['handle'].status()
        progress = s.progress * 100
        print(f'[{movie_id}] Progress: {progress:.1f}% | peers: {s.num_peers}')

        torrent.refresh_from_db()
        ffmpeg_started = torrent.status in ('processing', 'ready')

        if not ffmpeg_started and progress >= 5:
            video_file = _find_video_file(movie_dir)
            if video_file:
                moov_ok, v_codec, a_codec = pre_check_video(video_file)
                if moov_ok:
                    print(f'[{movie_id}] ✅ Starting FFmpeg | Codecs: {v_codec}/{a_codec}')
                    codec_args = get_ffmpeg_args(v_codec, a_codec)
                    start_ffmpeg(video_file, hls_dir, movie_id, torrent, codec_args)
                else:
                    print(f'[{movie_id}] ⏳ Moov not ready... {progress:.1f}%')
            else:
                print(f'[{movie_id}] ⏳ Video file not found yet...')

        if s.is_seeding or progress >= 100.0:
            print(f'[{movie_id}] ✅ Download complete')
            return

        self.apply_async(args=[movie_id], countdown=3)

    except Movie.DoesNotExist:
        print(f'[ERROR] Movie {movie_id} not found')
    except Torrent.DoesNotExist:
        print(f'[ERROR] Torrent for movie {movie_id} not found')
    except Exception as e:
        import traceback
        print(f'[ERROR] movie {movie_id}: {e}')
        traceback.print_exc()


def _find_video_file(directory):
    VIDEO_EXTENSIONS = (
        '.mkv', '.mp4', '.avi', '.webm',
        '.divx', '.mov', '.flv', '.wmv',
        '.m4v', '.mpg', '.mpeg'
    )
    for root, _, files in os.walk(directory):
        for f in files:
            if f.lower().endswith(VIDEO_EXTENSIONS):
                full_path = os.path.join(root, f)
                print(f'[find_video] ✅ Found: {full_path}')
                return full_path
    return None


def pre_check_video(file_path):
    moov_available = False
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', file_path],
            capture_output=True,
            timeout=2
        )
        moov_available = result.returncode == 0
    except Exception:
        pass

    video_codec = None
    audio_codec = None
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,codec_type',
             '-of', 'json', file_path],
            capture_output=True, text=True, timeout=2
        )
        data = json.loads(result.stdout)
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'video':
                video_codec = stream.get('codec_name')
            elif stream.get('codec_type') == 'audio':
                audio_codec = stream.get('codec_name')
    except Exception:
        pass

    return moov_available, video_codec, audio_codec


def get_ffmpeg_args(video_codec, audio_codec):
    if video_codec == 'h264' and audio_codec == 'aac':
        return ['-c:v', 'copy', '-c:a', 'copy']
    elif video_codec in ('h264', 'h265'):
        return ['-c:v', 'libx264', '-c:a', 'copy']
    else:
        return ['-c:v', 'libx264', '-c:a', 'aac']
    
# @shared_task
# def cleanup_old_movies():
#     """Delete .mkv and torrent record after 1 month unwatched"""
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
        
#         # ✅ Delete torrent record
#         Torrent.objects.filter(movie=movie).delete()
#         print(f'[Cleanup] Deleted torrent record for {movie.title} ✅')
        
#         # Delete directories
#         for folder in [movie_dir, hls_dir]:
#             if os.path.exists(folder):
#                 shutil.rmtree(folder)
#                 print(f'[Cleanup] Deleted {folder} ✅')
        
#         movie.status       = 'idle'
#         movie.hls_path     = None
#         movie.last_watched = None
#         movie.save()
        
#         print(f'[Cleanup] Reset: {movie.title} ✅')



