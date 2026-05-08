import os
import subprocess
import threading
import time

from .models import Movie

SEGMENTS_DIR = '/media/hls/'
SEGMENT_DURATION = 10  # seconds per segment
SEGMENT_TTL = 300      # delete segment 5 min after creation


# def get_movie_hls_dir(movie_id):
#     return os.path.join(SEGMENTS_DIR, str(movie_id))


# def get_playlist_path(movie_id):
#     return os.path.join('/media/hls/' + str(movie_id) + '/', 'playlist.m3u8')


# def cleanup_segment_after_ttl(segment_path, ttl=SEGMENT_TTL):
#     """
#     Delete .ts segment after TTL seconds
#     Runs in background thread to free disk space
    
#     Flow:
#     Segment created → Wait TTL seconds → Delete segment
#     """
#     def delete_after_wait():
#         time.sleep(ttl)
#         try:
#             if os.path.exists(segment_path):
#                 os.remove(segment_path)
#                 print(f"Deleted segment: {segment_path}")
#         except Exception as e:
#             print(f"Error deleting segment {segment_path}: {e}")

#     threading.Thread(target=delete_after_wait, daemon=True).start()


def generate_hls_from_file(movie_id, input_path):
    """
    Generate full HLS playlist + segments from complete file
    Used when movie is fully downloaded

    FFmpeg splits video into:
    - playlist.m3u8  (index file)
    - segment0.ts    (first 10 seconds)
    - segment1.ts    (next 10 seconds)
    - ...
    
    Each segment deleted after TTL to free disk
    """
    hls_dir = '/media/hls/' + str(movie_id) + '/'
    os.makedirs(hls_dir, exist_ok=True)

    playlist_path = '/media/hls/' + str(movie_id) + '/playlist.m3u8'

    # Already generated
    # if os.path.exists(playlist_path):
    #     return playlist_path

    segment_pattern = os.path.join(hls_dir, 'segment%d.ts')

    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-f', 'hls',
        # '-hls_time', str(SEGMENT_DURATION),
        '-hls_segment_filename', segment_pattern,
        # '-hls_flags', 'independent_segments',
        '-hls_list_size', '10',
        '-hls_flags', 'delete_segments+independent_segments',

        playlist_path
    ]

    result = subprocess.run(cmd, capture_output=True, timeout=3600, check=True)

    # Schedule deletion for each generated segment
    # for f in os.listdir(hls_dir):
    #     if f.endswith('.ts'):
    #         cleanup_segment_after_ttl(os.path.join(hls_dir, f))

    # print(f"HLS generated for movie {movie_id}: {playlist_path}")
    return playlist_path

def find_input_file(movie_id):
    movie_dir = os.path.join('/media/movies/', str(movie_id))
    for f in os.listdir(movie_dir):
        if f.endswith('.mp4') or f.endswith('.mkv') or f.endswith('.avi') or f.endswith('.mov') or f.endswith('.flv'):
            return os.path.join(movie_dir, f)
    return None

def generate_hls_from_partial(movie_id, downloaded_bytes):
    """
    Generate HLS from partially downloaded file
    Only segments the portion already downloaded
    
    Called repeatedly as more data downloads:
    50MB downloaded  → generate segments 0-4
    100MB downloaded → generate segments 5-9
    150MB downloaded → generate segments 10-14
    ...
    """
    input_path = find_input_file(movie_id)
    hls_dir = '/media/hls/' + str(movie_id) + '/'

    os.makedirs(hls_dir, exist_ok=True)

    playlist_path = '/media/hls/' + str(movie_id) + '/playlist.m3u8'
    segment_pattern = os.path.join(hls_dir, 'segment%d.ts')
    # Calculate how much of the file we can safely segment
    # Avoid segmenting the last incomplete chunk
    safe_bytes = downloaded_bytes - (1024 * 1024)  # Leave last 1MB as safety margin
    if safe_bytes <= 0:
        return None

    # Create temp file with only the downloaded portion
    # temp_input = os.path.join(hls_dir, 'partial_input.mp4')
    # with open(input_path, 'rb') as f_in:
    #     with open(temp_input, 'wb') as f_out:
    #         f_out.write(f_in.read(safe_bytes))

    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-f', 'hls',
        # '-hls_time', str(SEGMENT_DURATION),
        '-hls_list_size', '0',
        '-hls_segment_filename', segment_pattern,
        '-hls_flags', 'delete_segments+independent_segments',
        playlist_path
    ]

    subprocess.run(cmd, capture_output=True, timeout=300, check=True)
    # try:

        # Cleanup temp file
        # if os.path.exists(temp_input):
        #     os.remove(temp_input)

        # Schedule TTL deletion for new segments
        # for f in os.listdir(hls_dir):
        #     if f.endswith('.ts'):
        #         full_path = os.path.join(hls_dir, f)
        #         cleanup_segment_after_ttl(full_path)

    return playlist_path

    # except Exception as e:
    #     print(f"Partial HLS generation error: {e}")
    #     if os.path.exists(temp_input):
    #         os.remove(temp_input)
    #     return None


# def cleanup_hls_dir(movie_id):
#     """Remove entire HLS directory for a movie"""
#     import shutil
#     hls_dir = get_movie_hls_dir(movie_id)
#     if os.path.exists(hls_dir):
#         shutil.rmtree(hls_dir, ignore_errors=True)
#         print(f"Cleaned up HLS dir for movie {movie_id}")