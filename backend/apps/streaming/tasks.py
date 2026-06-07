import json
import os
import signal
from celery import shared_task
from django.core.files.base import ContentFile
from .models import  Subtitle, Torrent
from apps.movies.models import Movie
from .torrent_engine import download_torrent, ACTIVE_TORRENTS
import libtorrent as lt
from .hls import start_ffmpeg
import os
import tempfile
from pathlib import Path
from django.conf import settings
from django.core.cache import cache
import subprocess

from .external_subtitles import download_external_subtitle_fallback
from .subtitles import (
    convert_srt_to_vtt,
    detect_subtitle_streams,
    extract_subtitle_stream,
)


DOWNLOAD_DIR  = settings.TORRENT_DOWNLOAD_ROOT
HLS_DIR       = settings.HLS_ROOT
MIN_BUFFER    = 5     
SUBTITLE_PREP_LOCK_TTL = 60 * 60


def wanted_subtitle_languages(user_language=None):
    languages = ['en']
    if user_language and user_language.lower() not in languages:
        languages.append(user_language.lower())
    return languages


def subtitle_log(message, **context):
    details = ' '.join(f'{key}={value}' for key, value in context.items() if value is not None)
    if details:
        print(f'[Subtitles] {message} | {details}')
    else:
        print(f'[Subtitles] {message}')


def subtitle_asset_exists(subtitle):
    if subtitle.file:
        return subtitle.file.storage.exists(subtitle.file.name)
    return bool(subtitle.subtitle_link)


def expire_stale_ready_subtitles(movie_id):
    stale_count = 0
    ready_subtitles = Subtitle.objects.filter(
        movie_id=movie_id,
        status=Subtitle.Status.READY,
    )

    for subtitle in ready_subtitles:
        if subtitle_asset_exists(subtitle):
            continue

        stale_count += 1
        subtitle.status = Subtitle.Status.ERROR
        subtitle.save(update_fields=['status'])
        subtitle_log(
            'Marked stale ready subtitle as error',
            movie_id=movie_id,
            subtitle_id=subtitle.id,
            file=subtitle.file.name if subtitle.file else None,
        )

    return stale_count


def enqueue_subtitle_preparation_once(movie_id, user_language=None, video_path=None):
    """
    Queue subtitle preparation with a short-lived dedupe lock.

    Playback/status endpoints can be called repeatedly, so this prevents them
    from flooding Celery with identical subtitle jobs.
    """
    language_key    = (user_language or 'default').lower()
    lock_key        = f'subtitles:prepare:{movie_id}:{language_key}'

    try:
        should_enqueue = cache.add(lock_key, 'queued', SUBTITLE_PREP_LOCK_TTL)
    except Exception as exc:
        subtitle_log('Cache lock failed; enqueueing anyway', movie_id=movie_id, error=exc)
        should_enqueue = True

    if not should_enqueue:
        subtitle_log('Preparation already queued recently', movie_id=movie_id, language=language_key)
        return None

    subtitle_log('Queueing subtitle preparation task', movie_id=movie_id, language=language_key, video_path=video_path)
    result = prepare_subtitles_for_movie.delay(
        movie_id,
        user_language=user_language,
        video_path=video_path,
    )
    subtitle_log('Subtitle preparation task queued', movie_id=movie_id, task_id=result.id)
    return result


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3})
def prepare_subtitles_for_movie(self, movie_id, user_language=None, video_path=None):
    """
    Prepare subtitles asynchronously.

    This task uses the earlier phases:
    1. Detect embedded subtitle streams with ffprobe.
    2. Extract matching SRT streams with FFmpeg.
    3. Convert SRT to WebVTT.
    4. Save ready Subtitle rows.
    5. Use OpenSubtitles fallback for languages still missing.
    """
    subtitle_log('Task started', movie_id=movie_id, user_language=user_language, video_path=video_path)

    movie = Movie.objects.filter(id=movie_id).first()
    if not movie:
        subtitle_log('Movie does not exist; skipping subtitle preparation', movie_id=movie_id)
        return

    expire_stale_ready_subtitles(movie_id)

    languages   = wanted_subtitle_languages(user_language)
    subtitle_log('Wanted languages resolved', movie_id=movie_id, languages=','.join(languages))

    torrent = Torrent.objects.filter(movie=movie).first()
    video_file = _resolve_subtitle_video_path(movie_id, video_path, torrent)
    if not video_file:
        subtitle_log('No local video file found; task finished without subtitles', movie_id=movie_id)
        return

    subtitle_log('Using local video file', movie_id=movie_id, video_path=video_file)
    _prepare_embedded_subtitles(movie, video_file, languages)

    for language in languages:
        has_ready_subtitle = Subtitle.objects.filter(
            movie=movie,
            language=language,
            status=Subtitle.Status.READY,
        )
        has_ready_subtitle = any(subtitle_asset_exists(subtitle) for subtitle in has_ready_subtitle)

        if has_ready_subtitle:
            subtitle_log('Ready subtitle already exists; skipping fallback', movie_id=movie.id, language=language)
            continue

        try:
            subtitle_log('Trying external subtitle fallback', movie_id=movie.id, language=language)
            subtitle = download_external_subtitle_fallback(movie.id, language)
            if subtitle:
                subtitle_log('External subtitle ready', movie_id=movie.id, language=language, subtitle_id=subtitle.id)
            else:
                subtitle_log('External provider returned no subtitle', movie_id=movie.id, language=language)
        except Exception as exc:
            subtitle_log('External fallback failed', movie_id=movie.id, language=language, error=exc)

    subtitle_log('Task finished', movie_id=movie_id)


def _resolve_subtitle_video_path(movie_id, video_path, torrent):
    candidate_paths = [video_path]
    if torrent:
        candidate_paths.append(torrent.video_path)

    for candidate in candidate_paths:
        if candidate and os.path.exists(candidate):
            subtitle_log('Resolved video path', movie_id=movie_id, video_path=candidate)
            return candidate
        if candidate:
            subtitle_log('Candidate video path does not exist', movie_id=movie_id, video_path=candidate)

    search_dir = f'{DOWNLOAD_DIR}/{movie_id}'
    subtitle_log('Searching download directory for video file', movie_id=movie_id, directory=search_dir)
    return _find_video_file(search_dir)


def _prepare_embedded_subtitles(movie, video_file, languages):
    subtitle_log('Detecting embedded subtitle streams', movie_id=movie.id, video_path=video_file)
    streams = detect_subtitle_streams(video_file)
    subtitle_log('Embedded subtitle detection finished', movie_id=movie.id, stream_count=len(streams))

    for stream in streams:
        language = (stream.language or '').lower()
        subtitle_log(
            'Embedded stream found',
            movie_id=movie.id,
            stream_index=stream.index,
            codec=stream.codec_name,
            language=language or 'unknown',
            title=stream.title,
        )

        if language not in languages:
            subtitle_log('Embedded stream language not wanted; skipping', movie_id=movie.id, stream_index=stream.index, language=language or 'unknown')
            continue

        has_ready_subtitle = Subtitle.objects.filter(
            movie=movie,
            language=language,
            status=Subtitle.Status.READY,
        )
        has_ready_subtitle = any(subtitle_asset_exists(subtitle) for subtitle in has_ready_subtitle)
        if has_ready_subtitle:
            subtitle_log('Ready embedded subtitle already exists; skipping stream', movie_id=movie.id, stream_index=stream.index, language=language)
            continue

        if stream.codec_name != 'subrip':
            subtitle_log('Embedded stream codec is not SRT/subrip; skipping', movie_id=movie.id, stream_index=stream.index, codec=stream.codec_name)
            continue

        with tempfile.TemporaryDirectory() as tmp_dir:
            srt_path = Path(tmp_dir) / f'{language}.{stream.index}.srt'
            vtt_path = Path(tmp_dir) / f'{language}.{stream.index}.vtt'

            subtitle_log('Extracting embedded subtitle stream', movie_id=movie.id, stream_index=stream.index, output=srt_path)
            extract_subtitle_stream(video_file, stream.index, str(srt_path))
            subtitle_log('Converting extracted subtitle to WebVTT', movie_id=movie.id, stream_index=stream.index, output=vtt_path)
            convert_srt_to_vtt(str(srt_path), str(vtt_path))

            subtitle = Subtitle(
                movie=movie,
                language=language,
                label=stream.title or language.upper(),
                source=Subtitle.Source.EMBEDDED,
                status=Subtitle.Status.READY,
                stream_index=stream.index,
                subtitle_link='',
            )
            subtitle.file.save(
                f'movie_{movie.id}/{language}.embedded.{stream.index}.vtt',
                ContentFile(vtt_path.read_bytes()),
                save=True,
            )
            subtitle_log('Embedded subtitle ready', movie_id=movie.id, stream_index=stream.index, language=language, subtitle_id=subtitle.id, file=subtitle.file.name)

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
            if torrent.status == 'ready' and torrent.hls_path and os.path.exists(torrent.hls_path):
                print(f'[{movie_id}] Already ready and HLS exists: {torrent.hls_path}')
                enqueue_subtitle_preparation_once(movie_id, video_path=torrent.video_path)
                return

            print(f'[{movie_id}] Starting or re-attaching torrent download | previous_status={torrent.status}')
            torrent.status = 'downloading'
            torrent.hls_path = None
            if torrent.video_path and not os.path.exists(torrent.video_path):
                torrent.video_path = None
            torrent.save(update_fields=['status', 'hls_path', 'video_path'])
            download_torrent(movie_dir, torrent)

        if movie_id not in ACTIVE_TORRENTS:
            print(f'[{movie_id}] download_torrent did not populate ACTIVE_TORRENTS!')
            return  # stop re-queuing, something is wrong

        s        = ACTIVE_TORRENTS[movie_id]['handle'].status()
        progress = s.progress * 100
        print(f'[{movie_id}] Progress: {progress:.1f}% | peers: {s.num_peers}')

        torrent.refresh_from_db()
        ffmpeg_started = torrent.status in ('processing', 'ready')

        if not ffmpeg_started:
            video_file = _find_video_file(movie_dir)
            if video_file:
                
                torrent.video_path = video_file
                torrent.save(update_fields=['video_path'])

                # Original version started FFmpeg around 5% downloaded:
                # if progress >= 5:
                #
                # Why it is changed:
                # sparse torrent files can contain holes. FFmpeg may see the
                # MP4 header early, create a few HLS segments, then crash when it
                # reaches missing bytes. We wait for the selected file to be
                # effectively complete before creating the final HLS playlist.
                if progress >= 99.5 or s.is_seeding:
                    moov_ok, v_codec, a_codec = pre_check_video(video_file)
                    if moov_ok:
                        print(f'[{movie_id}] ✅ Starting FFmpeg | Codecs: {v_codec}/{a_codec}')
                        codec_args = get_ffmpeg_args(v_codec, a_codec)
                        start_ffmpeg(video_file, hls_dir, movie_id, torrent, codec_args)
                    else:
                        print(f'[{movie_id}] ⏳ Download complete, but video metadata is not readable yet')
                else:
                    print(f'[{movie_id}] ⏳ Waiting for full download before HLS... {progress:.1f}%')
            else:
                print(f'[{movie_id}] ⏳ Video file not found yet...')

        torrent.refresh_from_db()
        if torrent.status == 'ready':
            print(f'[{movie_id}] ✅ Download and HLS processing complete')
            enqueue_subtitle_preparation_once(movie_id, video_path=torrent.video_path)
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
#     """Delete inactive torrent media, HLS output, and cached subtitle files."""
#     from django.utils import timezone
#     from datetime import timedelta
    
#     cutoff = timezone.now() - timedelta(days=settings.STREAMING_CLEANUP_AFTER_DAYS)
#     old_torrents = Torrent.objects.filter(last_accessed_at__lt=cutoff)

#     print(
#         '[Cleanup] Starting inactive media cleanup | '
#         f'after_days={settings.STREAMING_CLEANUP_AFTER_DAYS} '
#         f'cutoff={cutoff.isoformat()} count={old_torrents.count()}'
#     )

#     for torrent in old_torrents.select_related('movie').iterator():
#         movie = torrent.movie
#         movie_dir = f'{DOWNLOAD_DIR}/{movie.id}'
#         hls_dir = f'{HLS_DIR}/{movie.id}'

#         subtitle_count = 0
#         for subtitle in movie.subtitles.all():
#             if subtitle.file:
#                 subtitle.file.delete(save=False)
#             subtitle_count += 1
#         movie.subtitles.all().delete()
#         print(f'[Cleanup] Deleted subtitle cache | movie_id={movie.id} count={subtitle_count}')

#         for folder in [movie_dir, hls_dir]:
#             if os.path.exists(folder):
#                 shutil.rmtree(folder)
#                 print(f'[Cleanup] Deleted media folder | movie_id={movie.id} folder={folder}')

#         torrent.delete()
#         print(f'[Cleanup] Deleted torrent row | movie_id={movie.id} title={movie.title}')

#     print('[Cleanup] Inactive media cleanup finished')
