import json
import logging
import os
import tempfile
from pathlib import Path

from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.core.files.base import ContentFile

from apps.movies.models import Movie
from .models import Subtitle, Torrent
from .torrent_engine import download_torrent, ACTIVE_TORRENTS
from .hls import start_ffmpeg
from .subtitles import (
    convert_srt_to_vtt,
    detect_subtitle_streams,
    extract_subtitle_stream,
    normalize_subtitle_language,
)
from .external_subtitles import download_external_subtitle_fallback

import subprocess

logger = logging.getLogger(__name__)

DOWNLOAD_DIR = settings.TORRENT_DOWNLOAD_ROOT
HLS_DIR = settings.HLS_ROOT

# How long (seconds) the dedup lock prevents re-queuing the same subtitle job.
# 1 hour is enough — if the task fails Celery retries it internally.
SUBTITLE_PREP_LOCK_TTL = 60 * 60


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def subtitle_log(message, **context):
    """Structured subtitle log line — use logger so output respects Django LOGGING config."""
    details = ' '.join(f'{k}={v}' for k, v in context.items() if v is not None)
    logger.info('[Subtitles] %s%s', message, f' | {details}' if details else '')


def _find_video_file(directory):
    VIDEO_EXTENSIONS = (
        '.mkv', '.mp4', '.avi', '.webm',
        '.divx', '.mov', '.flv', '.wmv',
        '.m4v', '.mpg', '.mpeg',
    )
    for root, _, files in os.walk(directory):
        for f in files:
            if f.lower().endswith(VIDEO_EXTENSIONS):
                full_path = os.path.join(root, f)
                print(f'[find_video] Found: {full_path}')
                return full_path
    return None


def wanted_subtitle_languages(user_language=None):
    """Temporary test mode: prepare English subtitles only."""
    languages = ['en']

    # Re-enable this after English-only validation:
    normalized_user_language = normalize_subtitle_language(user_language)
    if normalized_user_language and normalized_user_language not in languages:
        languages.append(normalized_user_language)

    return languages


# ---------------------------------------------------------------------------
# Public dedup helper — called from views when stream becomes ready
# ---------------------------------------------------------------------------

def enqueue_subtitle_preparation_once(movie_id, user_language=None, video_path=None):
    """
    Queue subtitle preparation with a cache-based dedup lock so repeated
    status-poll requests from the frontend do not flood Celery.
    """
    language_key = normalize_subtitle_language(user_language) or 'default'
    lock_key = f'subtitles:prepare:{movie_id}:{language_key}'

    try:
        should_enqueue = cache.add(lock_key, 'queued', SUBTITLE_PREP_LOCK_TTL)
    except Exception as exc:
        subtitle_log('Cache lock failed; enqueueing anyway', movie_id=movie_id, error=exc)
        should_enqueue = True

    if not should_enqueue:
        subtitle_log('Preparation already queued recently', movie_id=movie_id, language=language_key)
        return None

    subtitle_log('Queueing subtitle preparation task', movie_id=movie_id, video_path=video_path)
    result = prepare_subtitles_for_movie.delay(movie_id, user_language=user_language, video_path=video_path)
    subtitle_log('Task queued', movie_id=movie_id, task_id=result.id)
    return result


# ---------------------------------------------------------------------------
# Subtitle preparation task
# ---------------------------------------------------------------------------

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3})
def prepare_subtitles_for_movie(self, movie_id, user_language=None, video_path=None):
    """
    Prepare subtitles for a movie in two phases:

    Phase 1 — Embedded subtitles
        Use ffprobe to list subtitle streams inside the local video file.
        Extract any SRT streams for wanted languages, convert to WebVTT, save.

    Phase 2 — External fallback (OpenSubtitles)
        For every wanted language still missing a ready subtitle, query
        OpenSubtitles and download + convert the best match.
    """
    subtitle_log('Task started', movie_id=movie_id, user_language=user_language, video_path=video_path)

    movie = Movie.objects.filter(id=movie_id).first()
    if not movie:
        subtitle_log('Movie not found; aborting', movie_id=movie_id)
        return

    languages = wanted_subtitle_languages(user_language)
    subtitle_log('Wanted languages', movie_id=movie_id, languages=','.join(languages))

    # Resolve the local video file path
    video_file = _resolve_video_path(movie_id, video_path)
    if not video_file:
        subtitle_log('No local video file found; skipping subtitle preparation', movie_id=movie_id)
        return

    subtitle_log('Using video file', movie_id=movie_id, video_path=video_file)

    # Phase 1: embedded subtitles
    _extract_embedded_subtitles(movie, video_file, languages)

    # Phase 2: external fallback for any language still missing
    for language in languages:
        if _has_ready_subtitle(movie, language):
            subtitle_log('Ready subtitle already exists; skipping external fallback', movie_id=movie_id, language=language)
            continue
        
        print(f'[Subtitles] No embedded subtitle for language={language} | movie_id={movie_id} | fetching from OpenSubtitles')

        try:
            subtitle_log('Trying OpenSubtitles fallback', movie_id=movie_id, language=language)
            subtitle = download_external_subtitle_fallback(movie_id, language)
            if subtitle:
                logger.info(
                    '[Subtitles] Subtitle ready | source=external movie_id=%s language=%s '
                    'subtitle_id=%d file=%s',
                    movie_id, language, subtitle.id, subtitle.file.name if subtitle.file else 'link',
                )
            else:
                subtitle_log('No external subtitle found', movie_id=movie_id, language=language)
        except Exception as exc:
            subtitle_log('External fallback error', movie_id=movie_id, language=language, error=exc)

    subtitle_log('Task finished', movie_id=movie_id)


def _resolve_video_path(movie_id, video_path):
    """Return the first existing candidate video path, or search the download dir."""
    torrent = Torrent.objects.filter(movie_id=movie_id).first()

    for candidate in [video_path, torrent.video_path if torrent else None]:
        if candidate and os.path.exists(candidate):
            return candidate

    # Fall back to scanning the download directory
    return _find_video_file(f'{DOWNLOAD_DIR}/{movie_id}')


def _has_ready_subtitle(movie, language):
    """Return True if at least one ready subtitle with a real asset exists."""
    normalized_language = normalize_subtitle_language(language)
    qs = Subtitle.objects.filter(movie=movie, status=Subtitle.Status.READY)
    for subtitle in qs:
        if normalize_subtitle_language(subtitle.language) != normalized_language:
            continue
        if subtitle.file and subtitle.file.storage.exists(subtitle.file.name):
            return True
        if subtitle.subtitle_link:
            return True
    return False


def _extract_embedded_subtitles(movie, video_file, languages):
    """Extract embedded SRT subtitle streams and save them as WebVTT."""
    subtitle_log('Detecting embedded subtitle streams', movie_id=movie.id)

    try:
        streams = detect_subtitle_streams(video_file)
    except Exception as exc:
        subtitle_log('ffprobe failed; skipping embedded subtitles', movie_id=movie.id, error=exc)
        return

    subtitle_log('Streams detected', movie_id=movie.id, count=len(streams))

    for stream in streams:
        language = normalize_subtitle_language(stream.language)

        if language not in languages:
            subtitle_log('Stream language not wanted; skipping', movie_id=movie.id, stream_index=stream.index, language=language or 'unknown')
            continue

        if _has_ready_subtitle(movie, language):
            subtitle_log('Ready subtitle already exists; skipping stream', movie_id=movie.id, stream_index=stream.index, language=language)
            continue

        # Only subrip (SRT) streams can be extracted cleanly with FFmpeg copy
        if stream.codec_name != 'subrip':
            subtitle_log('Non-SRT codec; skipping', movie_id=movie.id, stream_index=stream.index, codec=stream.codec_name)
            continue

        with tempfile.TemporaryDirectory() as tmp_dir:
            srt_path = Path(tmp_dir) / f'{language}.{stream.index}.srt'
            vtt_path = Path(tmp_dir) / f'{language}.{stream.index}.vtt'

            try:
                extract_subtitle_stream(video_file, stream.index, str(srt_path))
                convert_srt_to_vtt(str(srt_path), str(vtt_path))
            except Exception as exc:
                subtitle_log('Extraction or conversion failed', movie_id=movie.id, stream_index=stream.index, error=exc)
                continue

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
            logger.info(
                '[Subtitles] Subtitle ready | source=embedded movie_id=%s language=%s '
                'stream_index=%d subtitle_id=%d file=%s',
                movie.id, language, stream.index, subtitle.id, subtitle.file.name,
            )


# ---------------------------------------------------------------------------
# Download + HLS segmentation task (unchanged logic, comments added)
# ---------------------------------------------------------------------------

def pre_check_video(file_path):
    moov_available = False
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', file_path],
            capture_output=True,
            timeout=2,
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
            capture_output=True, text=True, timeout=2,
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


@shared_task(bind=True)
def download_and_segment(self, movie_id):
    try:
        movie = Movie.objects.get(id=movie_id)
        torrent = Torrent.objects.get(movie=movie)
        movie_dir = f'{DOWNLOAD_DIR}/{movie_id}'
        hls_dir = f'{HLS_DIR}/{movie_id}'

        os.makedirs(movie_dir, exist_ok=True)
        os.makedirs(hls_dir, exist_ok=True)

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
            return

        s = ACTIVE_TORRENTS[movie_id]['handle'].status()
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
                # Sparse torrent files can contain holes. FFmpeg may see the
                # MP4 header early, create a few HLS segments, then crash when
                # it reaches missing bytes. We wait for the selected file to be
                # effectively complete before creating the final HLS playlist.
                if progress >= 99.5 or s.is_seeding:
                    moov_ok, v_codec, a_codec = pre_check_video(video_file)
                    if moov_ok:
                        print(f'[{movie_id}] Starting FFmpeg | codecs={v_codec}/{a_codec}')
                        codec_args = get_ffmpeg_args(v_codec, a_codec)
                        start_ffmpeg(video_file, hls_dir, movie_id, torrent, codec_args)
                    else:
                        print(f'[{movie_id}] Download complete but video metadata not readable yet')
                else:
                    print(f'[{movie_id}] Waiting for full download... {progress:.1f}%')
            else:
                print(f'[{movie_id}] Video file not found yet')

        torrent.refresh_from_db()
        if torrent.status == 'ready':
            print(f'[{movie_id}] Download and HLS processing complete')
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
        
