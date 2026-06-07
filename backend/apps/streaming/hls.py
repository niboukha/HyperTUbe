
import subprocess
import time
import os

active_ffmpeg = {}


def playlist_is_complete(playlist_path, min_segments=3):
    if not os.path.exists(playlist_path):
        return False

    try:
        with open(playlist_path, 'r', encoding='utf-8') as playlist:
            content = playlist.read()
    except OSError:
        return False

    segment_count = content.count('.ts')
    return '#EXT-X-ENDLIST' in content and segment_count >= min_segments


def start_ffmpeg(video_file, hls_dir, movie_id, torrent, codec_args):
    """Start FFmpeg with pre-determined codec settings."""
    torrent.status = 'processing'
    torrent.hls_path = None
    torrent.save(update_fields=['status', 'hls_path'])

    os.makedirs(hls_dir, exist_ok=True)
    for filename in os.listdir(hls_dir):
        if filename.endswith(('.ts', '.m3u8', '.tmp')):
            os.remove(os.path.join(hls_dir, filename))

    playlist_path = f'{hls_dir}/playlist.m3u8'
    cmd = [
        'ffmpeg',
        '-fflags', '+genpts',
        '-fflags', '+ignidx',
        '-fflags', '+discardcorrupt', 
        '-err_detect', 'ignore_err',
        '-i', video_file,
        *codec_args,  # ⭐ Use pre-checked codecs
        '-f', 'hls',
        '-hls_time', '4',
        '-hls_list_size', '0',
        '-hls_flags', 'independent_segments',
        playlist_path
    ]
    
    try:
        print(f'✅ FFmpeg started ({codec_args[1]})')

        # Original version:
        # subprocess.Popen(cmd)
        # wait_for_segments(hls_dir)
        #
        # Why it is commented:
        # with torrent files, the first few HLS segments can appear while the
        # source video is still incomplete. If FFmpeg crashes after that, the DB
        # was still marked "ready" and the frontend received a broken playlist.
        # The safer version waits for FFmpeg to exit successfully before marking
        # the stream ready.
        subprocess.run(cmd, check=True)

        if not playlist_is_complete(playlist_path):
            raise RuntimeError('FFmpeg finished but HLS playlist is incomplete')

        torrent.status = 'ready'
        torrent.hls_path = playlist_path
        torrent.save(update_fields=['status', 'hls_path'])
        print(f'✅ HLS ready: {playlist_path}')
    except Exception as e:
        print(f'❌ Error: {e}')
        torrent.status = 'error'
        torrent.hls_path = None
        torrent.save(update_fields=['status', 'hls_path'])


def wait_for_segments(path, min_segments=3, timeout=30):
    start = time.time()

    while time.time() - start < timeout:
        ts_files = [f for f in os.listdir(path) if f.endswith(".ts")]

        if len(ts_files) >= min_segments:
            return True

        time.sleep(0.5)

    return False
