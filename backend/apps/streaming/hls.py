
import json
import subprocess
import time
from django.db import connection
import os

active_ffmpeg = {}

def start_ffmpeg(video_file, hls_dir, movie_id, torrent, codec_args):
    """Start FFmpeg with pre-determined codec settings."""
    torrent.status = 'processing'
    torrent.save()
    cmd = [
        'ffmpeg',
        '-fflags', '+genpts',
        '-fflags', '+ignidx',
        '-fflags', '+discardcorrupt', 
        '-i', video_file,
        *codec_args,  # ⭐ Use pre-checked codecs
        '-f', 'hls',
        '-hls_time', '4',
        '-hls_list_size', '0',
        '-hls_flags', 'independent_segments',
        f'{hls_dir}/playlist.m3u8'
    ]
    
    try:
        subprocess.Popen(cmd)
        print(f'✅ FFmpeg started ({codec_args[1]})')
        wait_for_segments(hls_dir)
        torrent.status = 'ready'
        torrent.hls_path =  f'/media/hls/{movie_id}/playlist.m3u8'
        torrent.save()
    except Exception as e:
        print(f'❌ Error: {e}')
        torrent.status = 'error'
        torrent.save()
        print(f'❌ Error: {e}')


def wait_for_segments(path, min_segments=3, timeout=30):
    start = time.time()

    while time.time() - start < timeout:
        ts_files = [f for f in os.listdir(path) if f.endswith(".ts")]

        if len(ts_files) >= min_segments:
            return True

        time.sleep(0.5)

    return False
