
import threading
import subprocess
from django.db import connection
import os
import time

active_ffmpeg = {}
# ──────────────────────────────────────────
# START FFMPEG — NON BLOCKING
# ──────────────────────────────────────────

def can_copy(video_file):
    """
    Check if MP4 is fully readable and codecs are H264/AAC
    """

    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_name",
                "-of", "default=noprint_wrappers=1:nokey=1",
                video_file
            ],
            capture_output=True,
            text=True
        )

        video_codec = result.stdout.strip()

        return video_codec == "h264"

    except Exception:
        return False


def _start_ffmpeg(video_file, hls_dir, movie_id, movie):
    """
    Start FFmpeg conversion in background.
    Notifies frontend when first segments are ready.
    """
    connection.close()

    hls_output = f'{hls_dir}/playlist.m3u8'

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
        ext = os.path.splitext(video_file)[1].lower()
        use_copy = ext == ".mp4" and can_copy(video_file)

        # =====================================================
        # COPY MODE
        # =====================================================

        if use_copy:

            ffmpeg_cmd = [
                "ffmpeg",
                "-y",

                "-fflags", "+genpts+igndts",

                "-i", video_file,

                "-c", "copy",

                "-start_number", "0",

                "-f", "hls",

                "-hls_time", "4",

                "-hls_list_size", "0",

                "-hls_flags", "independent_segments",

                "-hls_segment_filename",
                f"{hls_dir}/segment_%03d.ts",

                hls_output
            ]

        # =====================================================
        # TRANSCODE MODE
        # =====================================================

        else:

            ffmpeg_cmd = [
                "ffmpeg",
                "-y",

                "-fflags", "+genpts+igndts",

                "-i", video_file,

                "-c:v", "libx264",
                "-preset", "veryfast",
                "-tune", "zerolatency",

                "-c:a", "aac",
                "-b:a", "128k",

                "-pix_fmt", "yuv420p",

                "-g", "48",

                "-f", "hls",

                "-hls_time", "4",

                "-hls_list_size", "0",

                "-hls_flags", "independent_segments",

                "-hls_segment_filename",
                f"{hls_dir}/segment_%03d.ts",

                hls_output
            ]

        process = subprocess.Popen(ffmpeg_cmd)

        active_ffmpeg[movie_id] = process
        # ✅ Wait for first 3 segments → notify frontend
        _wait_for_segments(hls_dir, min_segments=3)

        # movie     = Movie.objects.get(id=movie_id)
        movie.hls_path = hls_output
        movie.status   = 'ready'
        movie.save()


        print(f'=============> [FFmpeg] Streaming started ✅')

        # Monitor FFmpeg in background
        def monitor():
            code = process.wait()
            print(f'[FFmpeg] Finished with code {code}')
            active_ffmpeg.pop(movie_id, None)

        threading.Thread(target=monitor, daemon=True).start()

    except Exception as e:
        print(f'=============>   [FFmpeg ERROR] {e}')
        movie.status = 'error'
        movie.save()
        

def _wait_for_segments(hls_dir, min_segments=3, timeout=120):
    print(f'=============> [FFmpeg] Waiting for {min_segments} segments...')
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
