import logging
import os
import re
import tempfile
from pathlib import Path

import subprocess

from celery import shared_task
from django.core.cache import cache
from django.core.files.base import ContentFile

from apps.movies.models import Movie
from apps.streaming.models import Subtitle, Torrent
from apps.streaming.subtitles import (
    convert_srt_to_vtt,
    detect_subtitle_streams,
    extract_subtitle_stream,
    normalize_subtitle_language,
)
from apps.streaming.external_subtitles import download_external_subtitle_fallback

logger = logging.getLogger(__name__)

# Cache-based dedup lock TTL — 1 hour is enough; Celery retries on failure.
SUBTITLE_PREP_LOCK_TTL = 60 * 60
SUBTITLE_DURATION_TOLERANCE = 0.10


# ── Public entry point ────────────────────────────────────────────────────────

def enqueue_subtitle_preparation_once(movie_id, user_language=None, video_path=None):
    """
    Queue subtitle preparation with a cache-based dedup lock so repeated
    status-poll requests from the frontend do not flood Celery.

    Lock key is based on the resolved language list, not the raw user_language
    string — user_language=None and user_language='en' both produce ['en'] and
    share the same lock, while user_language='fr' produces ['en', 'fr'] and
    gets its own lock so French subtitles can be queued after English ones.
    """
    languages = _wanted_subtitle_languages(user_language)
    lang_key  = '_'.join(sorted(languages))
    lock_key  = f'subtitles:prepare:{movie_id}:{lang_key}'

    try:
        should_enqueue = cache.add(lock_key, 'queued', SUBTITLE_PREP_LOCK_TTL)
    except Exception as exc:
        logger.warning('[Subtitles] Cache lock failed; enqueueing anyway | movie_id=%s error=%s', movie_id, exc)
        should_enqueue = True

    if not should_enqueue:
        logger.info('[Subtitles] Preparation already queued recently | movie_id=%s', movie_id)
        return None

    logger.info('[Subtitles] Queueing preparation task | movie_id=%s video_path=%s', movie_id, video_path)
    result = prepare_subtitles_for_movie.delay(movie_id, user_language=user_language, video_path=video_path)
    logger.info('[Subtitles] Task queued | movie_id=%s task_id=%s', movie_id, result.id)
    return result


# ── Celery task ───────────────────────────────────────────────────────────────

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
    logger.info('[Subtitles] Task started | movie_id=%s user_language=%s', movie_id, user_language)

    movie = Movie.objects.filter(id=movie_id).first()
    if not movie:
        logger.warning('[Subtitles] Movie not found; aborting | movie_id=%s', movie_id)
        return

    video_file = _resolve_video_path(movie_id, video_path)
    if not video_file:
        logger.info('[Subtitles] No local video file found; skipping | movie_id=%s', movie_id)
        return

    video_audio_lang = _detect_audio_language(video_file)
    languages        = _wanted_subtitle_languages(user_language, video_language=video_audio_lang)
    video_duration   = _ffprobe_duration(video_file)

    logger.info('[Subtitles] Languages to prepare | movie_id=%s languages=%s', movie_id, languages)

    # Phase 1: embedded subtitles
    _extract_embedded_subtitles(movie, video_file, languages, video_duration)

    # Phase 2: external fallback for any language still missing
    for language in languages:
        if _has_ready_subtitle(movie, language):
            logger.info('[Subtitles] Ready subtitle exists; skipping external | movie_id=%s language=%s', movie_id, language)
            continue

        try:
            logger.info('[Subtitles] Trying OpenSubtitles fallback | movie_id=%s language=%s', movie_id, language)
            subtitle = download_external_subtitle_fallback(
                movie_id,
                language,
                validator=lambda path, result: _subtitle_duration_is_valid(
                    video_duration, path,
                    movie_id=movie_id,
                    language=language,
                    source=f'external:{getattr(result, "provider_id", "")}',
                ),
            )
            if subtitle:
                logger.info('[Subtitles] External subtitle ready | movie_id=%s language=%s subtitle_id=%d', movie_id, language, subtitle.id)
            else:
                logger.info('[Subtitles] No external subtitle found | movie_id=%s language=%s', movie_id, language)
        except Exception as exc:
            logger.exception('[Subtitles] External fallback error | movie_id=%s language=%s error=%s', movie_id, language, exc)

    logger.info('[Subtitles] Task finished | movie_id=%s', movie_id)


# ── Private helpers ───────────────────────────────────────────────────────────

def _wanted_subtitle_languages(user_language=None, video_language=None) -> list[str]:
    languages = ['en']
    normalized_user = normalize_subtitle_language(user_language)
    if (
        normalized_user
        and normalized_user != normalize_subtitle_language(video_language)
        and normalized_user not in languages
    ):
        languages.append(normalized_user)
    return languages


def _resolve_video_path(movie_id, video_path) -> str | None:
    from django.conf import settings
    torrent = Torrent.objects.filter(movie_id=movie_id).first()
    for candidate in [video_path, torrent.video_path if torrent else None]:
        if candidate and os.path.exists(candidate):
            return candidate
    return _find_video_file(f'{settings.TORRENT_DOWNLOAD_ROOT}/{movie_id}')


def _find_video_file(directory) -> str | None:
    VIDEO_EXTENSIONS = ('.mkv', '.mp4', '.avi', '.webm', '.divx', '.mov', '.flv', '.wmv', '.m4v', '.mpg', '.mpeg')
    for root, _, files in os.walk(directory):
        for f in files:
            if f.lower().endswith(VIDEO_EXTENSIONS):
                return os.path.join(root, f)
    return None


def _has_ready_subtitle(movie, language) -> bool:
    normalized = normalize_subtitle_language(language)
    for subtitle in Subtitle.objects.filter(movie=movie, status=Subtitle.Status.READY):
        if normalize_subtitle_language(subtitle.language) != normalized:
            continue
        if subtitle.file and subtitle.file.storage.exists(subtitle.file.name):
            return True
        if subtitle.subtitle_link:
            return True
    return False


def _extract_embedded_subtitles(movie, video_file, languages, video_duration=None):
    logger.info('[Subtitles] Detecting embedded streams | movie_id=%s', movie.id)
    try:
        streams = detect_subtitle_streams(video_file)
    except Exception as exc:
        logger.warning('[Subtitles] ffprobe failed; skipping embedded | movie_id=%s error=%s', movie.id, exc)
        return

    for stream in streams:
        language = normalize_subtitle_language(stream.language)

        if language not in languages:
            continue
        if _has_ready_subtitle(movie, language):
            continue
        if stream.codec_name != 'subrip':
            logger.info('[Subtitles] Non-SRT codec; skipping | movie_id=%s codec=%s', movie.id, stream.codec_name)
            continue

        with tempfile.TemporaryDirectory() as tmp_dir:
            srt_path = Path(tmp_dir) / f'{language}.{stream.index}.srt'
            vtt_path = Path(tmp_dir) / f'{language}.{stream.index}.vtt'

            try:
                extract_subtitle_stream(video_file, stream.index, str(srt_path))
                convert_srt_to_vtt(str(srt_path), str(vtt_path))
            except Exception as exc:
                logger.warning('[Subtitles] Extraction failed | movie_id=%s stream=%d error=%s', movie.id, stream.index, exc)
                continue

            if not _subtitle_duration_is_valid(
                video_duration, str(vtt_path),
                movie_id=movie.id, language=language,
                source=f'embedded:{stream.index}',
            ):
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
            logger.info('[Subtitles] Embedded subtitle ready | movie_id=%s language=%s stream=%d', movie.id, language, stream.index)


def _ffprobe_duration(file_path) -> float | None:
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', file_path],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode != 0:
            return None
        return float(result.stdout.strip())
    except Exception:
        return None


def _detect_audio_language(video_file) -> str | None:
    import json
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'stream=index,codec_type:stream_tags=language',
             '-of', 'json', video_file],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode != 0:
            return None
        for stream in json.loads(result.stdout).get('streams', []):
            if stream.get('codec_type') == 'audio':
                lang = stream.get('tags', {}).get('language')
                if lang:
                    return normalize_subtitle_language(lang)
    except Exception:
        return None
    return None


def _subtitle_duration(file_path) -> float | None:
    duration = _ffprobe_duration(file_path)
    if duration:
        return duration
    try:
        content = Path(file_path).read_text(encoding='utf-8-sig', errors='ignore')
    except OSError:
        return None
    last_end = None
    for match in re.finditer(
        r'(?P<start>\d{1,2}:\d{2}(?::\d{2})?[\.,]\d{3})\s*-->\s*(?P<end>\d{1,2}:\d{2}(?::\d{2})?[\.,]\d{3})',
        content,
    ):
        end = _parse_subtitle_timestamp(match.group('end'))
        if end is not None:
            last_end = end
    return last_end


def _parse_subtitle_timestamp(value) -> float | None:
    value = value.strip().replace(',', '.')
    parts = value.split(':')
    try:
        if len(parts) == 3:
            h, m, s = parts
            return int(h) * 3600 + int(m) * 60 + float(s)
        if len(parts) == 2:
            m, s = parts
            return int(m) * 60 + float(s)
    except ValueError:
        return None
    return None


def _subtitle_duration_is_valid(video_duration, subtitle_path, *, movie_id, language, source) -> bool:
    if not video_duration:
        return True
    sub_duration = _subtitle_duration(subtitle_path)
    if not sub_duration:
        logger.info('[Subtitles] Duration unavailable; rejecting | movie_id=%s language=%s', movie_id, language)
        return False
    mismatch = abs(video_duration - sub_duration) / video_duration
    if mismatch > SUBTITLE_DURATION_TOLERANCE:
        logger.info(
            '[Subtitles] Duration mismatch; rejecting | movie_id=%s language=%s '
            'video=%.2f sub=%.2f mismatch=%.3f',
            movie_id, language, video_duration, sub_duration, mismatch,
        )
        return False
    return True
