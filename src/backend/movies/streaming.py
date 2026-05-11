import subprocess
import json


def get_media_codecs(video_file):
    """
    Detect video/audio codecs using ffprobe
    """

    cmd = [
        'ffprobe',
        '-v', 'quiet',

        # output as JSON
        '-print_format', 'json',

        # show streams
        '-show_streams',

        video_file
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )

    data = json.loads(result.stdout)

    video_codec = None
    audio_codec = None

    for stream in data.get('streams', []):

        # video stream
        if stream.get('codec_type') == 'video':
            video_codec = stream.get('codec_name')

        # audio stream
        elif stream.get('codec_type') == 'audio':
            audio_codec = stream.get('codec_name')

    return {
        'video': video_codec,
        'audio': audio_codec
    }

def build_ffmpeg_hls_command(video_file, hls_dir, hls_output):
    
    codecs = get_media_codecs(video_file)

    # =====================================================
    # Shared HLS options
    # =====================================================
    ffmpeg_cmd = [
        'ffmpeg',
        '-y',

        # better timestamps for torrents / incomplete files
        '-fflags', '+genpts+igndts',

        # IMPORTANT:
        # allows ffmpeg to continue reading growing torrent file
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '2',

        '-i', video_file,
    ]

    # =====================================================
    # Browser-compatible codecs
    # =====================================================
    video_codec = codecs.get('video', '').lower()
    audio_codec = codecs.get('audio', '').lower()

    is_compatible = (
        video_codec in ['h264', 'avc1']
        and audio_codec in ['aac', 'mp3']
    )

    if is_compatible:

        print('✅ Compatible codecs → stream copy')

        # NO transcoding
        ffmpeg_cmd += [
            '-c:v', 'copy',
            '-c:a', 'copy',
        ]

    else:

        print('⚠️ Unsupported codecs → transcoding')

        ffmpeg_cmd += [

            # video
            '-c:v', 'libx264',

            # faster encoding for live streaming
            '-preset', 'veryfast',

            # IMPORTANT:
            # reduces latency
            '-tune', 'zerolatency',

            # web compatibility
            '-pix_fmt', 'yuv420p',

            # audio
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ac', '2',

            # faster start
            '-movflags', '+faststart',
        ]

    # =====================================================
    # HLS options
    # =====================================================
    ffmpeg_cmd += [

        '-f', 'hls',

        # better compromise
        '-hls_time', '6',

        # VERY IMPORTANT:
        # keeps playlist smaller
        '-hls_list_size', '15',

        # LIVE/EVENT streaming
        '-hls_playlist_type', 'event',

        # segment naming
        '-hls_segment_filename',
        f'{hls_dir}/output_%03d.ts',

        # IMPORTANT FLAGS
        '-hls_flags',
        'append_list+independent_segments',

        # avoid cache issues
        '-hls_allow_cache', '0',

        hls_output
    ]

    print('FFmpeg command:')
    print(' '.join(ffmpeg_cmd))

    # process = subprocess.Popen(
    #     ffmpeg_cmd,
    #     stdout=subprocess.DEVNULL,
    #     stderr=subprocess.STDOUT
    # )
    return ffmpeg_cmd