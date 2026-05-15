import os
from celery import shared_task
from .models import Movie,  Torrent
import shutil

import time

from .models import Movie, Torrent
from .torrent_engine import download_torrent, ACTIVE_TORRENTS
import libtorrent as lt
from .hls import start_ffmpeg
import os
from django.db import connection


DOWNLOAD_DIR  = '/tmp/torrents'
HLS_DIR       = '/media/hls'
MIN_BUFFER    = 5     

@shared_task
def download_and_segment(movie_id):
    """
    1. Start torrent download
    2. Wait for MIN_BUFFER % downloaded
    3. Start FFmpeg conversion in background thread
    4. Keep downloading while FFmpeg converts
    5. When fully downloaded → save file
    """
    connection.close()  # Close DB connection to prevent issues in long-running task    

    try:
        movie = Movie.objects.get(id=movie_id)

        movie_dir = f'{DOWNLOAD_DIR}/{movie_id}'
        hls_dir   = f'{HLS_DIR}/{movie_id}'

        os.makedirs(movie_dir, exist_ok=True)
        os.makedirs(hls_dir,   exist_ok=True)
        
        torrent = Torrent.objects.get(movie=movie)
        handle = download_torrent(movie_dir, torrent)

      
        ffmpeg_started = False 

        while True:
            s = ACTIVE_TORRENTS[movie_id]['handle'].status()
            progress = s.progress * 100
            
            if not ffmpeg_started and progress >= 5:
                video_file = _find_video_file(movie_dir)
                
                moov_ok, v_codec, a_codec = pre_check_video(video_file)
                
                if moov_ok:
                    print(f'✅ Moov available | Codecs: {v_codec}/{a_codec}')
                    
                    codec_args = get_ffmpeg_args(v_codec, a_codec)
                    
                    start_ffmpeg(video_file, hls_dir, movie_id, torrent, codec_args)
                    ffmpeg_started = True
                   
                else:
                    print(f'⏳ Moov not ready yet... {progress:.1f}%')
            
            if s.is_seeding or progress >= 100.0:
                break
            
            time.sleep(2)

    except Exception as e:
        print(f'[ERROR] movie {movie_id}: {e}')
        movie.status = 'error'
        movie.save()



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

def pre_check_video(file_path):
    """
    Check if file is ready and get codec info.
    Returns: (moov_available, video_codec, audio_codec)
    """
    import subprocess
    import json
    
    # Check 1: Is moov available?
    moov_available = False
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', file_path],
            capture_output=True,
            timeout=2
        )
        moov_available = result.returncode == 0
    except:
        pass
    
    # Check 2: Get codecs
    video_codec = None
    audio_codec = None
    
    try:
        cmd = [
            'ffprobe', '-v', 'error', '-show_entries',
            'stream=codec_name', '-of', 'json', file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=2)
        data = json.loads(result.stdout)
        
        for stream in data.get('streams', []):
            codec = stream.get('codec_name')
            if stream.get('codec_type') == 'video':
                video_codec = codec
            elif stream.get('codec_type') == 'audio':
                audio_codec = codec
    except:
        pass
    
    return moov_available, video_codec, audio_codec


def get_ffmpeg_args(video_codec, audio_codec):
    """Decide copy or transcode based on codecs."""
    if video_codec == 'h264' and audio_codec == 'aac':
        return ['-c:v', 'copy', '-c:a', 'copy']  # ✅ Fast
    elif video_codec in ['h264', 'h265']:
        return ['-c:v', 'libx264', '-c:a', 'copy']  # ⚠️ Medium
    else:
        return ['-c:v', 'libx264', '-c:a', 'aac']  # ❌ Slow but safe
    
@shared_task
def cleanup_old_movies():
    """Delete .mkv and torrent record after 1 month unwatched"""
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
        
        # ✅ Delete torrent record
        Torrent.objects.filter(movie=movie).delete()
        print(f'[Cleanup] Deleted torrent record for {movie.title} ✅')
        
        # Delete directories
        for folder in [movie_dir, hls_dir]:
            if os.path.exists(folder):
                shutil.rmtree(folder)
                print(f'[Cleanup] Deleted {folder} ✅')
        
        movie.status       = 'idle'
        movie.hls_path     = None
        movie.last_watched = None
        movie.save()
        
        print(f'[Cleanup] Reset: {movie.title} ✅')



