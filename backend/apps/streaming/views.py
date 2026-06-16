import os
import logging
from datetime import date

from django.http import FileResponse, Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from django.utils import timezone
from apps.movies.models import Movie
from .models import Subtitle, Torrent
from .subtitles import normalize_subtitle_language

logger = logging.getLogger(__name__)


def media_file_response(path, content_type):
    if not path or not os.path.exists(path):
        raise Http404('Media file not found')

    response = FileResponse(open(path, 'rb'), content_type=content_type)
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


def preferred_subtitle_language(request):
    """
    Pick a subtitle language from an explicit query param first, then the
    browser Accept-Language header. English is still always included by tasks.
    """
    # Temporary test mode: force English subtitles only.
    # Re-enable this after English-only validation:
    explicit_language = request.query_params.get('language')
    if explicit_language:
        return normalize_subtitle_language(explicit_language)
    
    accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
    for part in accept_language.split(','):
        language = normalize_subtitle_language(part.split(';', 1)[0])
        if language:
            return language
    
    return None
    # return 'en'


def subtitle_asset_exists(subtitle):
    if subtitle.file:
        return subtitle.file.storage.exists(subtitle.file.name)
    return bool(subtitle.subtitle_link)


def mark_stale_ready_subtitle(subtitle):
    subtitle.status = Subtitle.Status.FAILED
    subtitle.save(update_fields=['status'])


class _ArchivePending(Exception):
    """Archive.org metadata fetch timed out — movie may exist but is not indexed yet."""
    pass


def resolve_streaming_movie(movie_ref):
    movie_ref = str(movie_ref)

    # Numeric: DB pk lookup only — never create from a bare integer.
    if movie_ref.isdigit():
        return (
            Movie.objects.filter(id=int(movie_ref)).first()
            or Movie.objects.filter(tmdb_id=movie_ref).first()
        )

    # Prefixed canonical lookup first, then create with canonical ID.
    local_movie = Movie.objects.filter(tmdb_id=movie_ref).first()
    if local_movie:
        return local_movie

    if movie_ref.startswith('archive-'):
        archive_id = movie_ref.removeprefix('archive-')
        # Migration compat: find rows created before prefix enforcement.
        return (
            Movie.objects.filter(tmdb_id=archive_id).first()
            or create_streaming_movie_from_archive(archive_id)
        )

    if movie_ref.startswith('publicdomain-'):
        publicdomain_id = movie_ref.removeprefix('publicdomain-')
        return (
            Movie.objects.filter(tmdb_id=publicdomain_id).first()
            or create_streaming_movie_from_publicdomain(publicdomain_id)
        )

    # Bare string without a known prefix — assume archive.
    return (
        create_streaming_movie_from_archive(movie_ref)
        or create_streaming_movie_from_publicdomain(movie_ref)
    )


def create_streaming_movie_from_archive(archive_id):
    from apps.movies.adapters.archive import fetch_detail
    import requests

    detail = fetch_detail(archive_id)
    if not detail:
        return None
    if detail.get('_pending'):
        raise _ArchivePending(archive_id)

    torrent_url = f'https://archive.org/download/{archive_id}/{archive_id}_archive.torrent'

    try:
        metadata = requests.get(f'https://archive.org/metadata/{archive_id}', timeout=10).json()
    except Exception as exc:
        metadata = {}
        print(
            '[Streaming] Could not fetch Archive metadata; using fallback torrent URL | '
            f'archive_id={archive_id} torrent_url={torrent_url} error={exc}'
        )
    else:
        for file_info in metadata.get('files', []):
            name = file_info.get('name', '')
            if name.endswith('.torrent'):
                torrent_url = f'https://archive.org/download/{archive_id}/{name}'
                break

    release_date = _parse_release_year(detail.get('year') or detail.get('release_date'))

    movie, _ = Movie.objects.get_or_create(
        tmdb_id=f"archive-{archive_id}",
        defaults={
            'title': detail.get('title') or archive_id,
            'overview': detail.get('overview') or '',
            'poster_url': detail.get('poster_path') or '',
            'backdrop_url': detail.get('backdrop_path') or '',
            'release_date': release_date,
            'rating': detail.get('rating') or 0,
            'duration': _runtime_to_minutes(detail.get('runtime')),
            'is_watchable': True,
            'torrent_url': torrent_url,
        },
    )
    print(f'[Streaming] Created local Archive movie for streaming | movie_id={movie.id} archive_id={archive_id}')
    return movie


def create_streaming_movie_from_publicdomain(publicdomain_id):
    from apps.movies.adapters.publicdomain import fetch_detail

    detail = fetch_detail(publicdomain_id)
    if not detail:
        return None

    torrent_files = detail.get('torrent_files') or []
    if not torrent_files:
        print(f'[Streaming] PublicDomain movie has no torrent file | publicdomain_id={publicdomain_id}')
        return None

    movie, _ = Movie.objects.get_or_create(
        tmdb_id=f"publicdomain-{publicdomain_id}",
        defaults={
            'title': detail.get('title') or publicdomain_id,
            'overview': detail.get('overview') or '',
            'poster_url': detail.get('poster_path') or '',
            'backdrop_url': detail.get('backdrop_path') or '',
            'release_date': None,
            'rating': detail.get('rating') or 0,
            'duration': _runtime_to_minutes(detail.get('runtime')),
            'is_watchable': True,
            'torrent_url': torrent_files[0].get('url') or '',
        },
    )
    print(f'[Streaming] Created local PublicDomain movie for streaming | movie_id={movie.id} publicdomain_id={publicdomain_id}')
    return movie


def _parse_release_year(value):
    if not value:
        return None
    try:
        return date(int(str(value)[:4]), 1, 1)
    except Exception:
        return None


def _runtime_to_minutes(value):
    if not value:
        return None
    s = str(value).strip()
    # Plain integer — already in minutes (e.g. "74")
    if s.isdigit():
        return int(s)
    # HH:MM:SS  or  H:MM:SS  or  H:MM
    parts = s.split(":")
    try:
        if len(parts) == 3:
            h, m, _ = map(int, parts)
            return h * 60 + m
        if len(parts) == 2:
            h, m = map(int, parts)
            return h * 60 + m
    except ValueError:
        pass
    # "Xh Ym" / "Xh" / "Ym"  (e.g. from format_runtime output)
    import re
    hm = re.search(r"(\d+)\s*h", s, re.IGNORECASE)
    mm = re.search(r"(\d+)\s*m", s, re.IGNORECASE)
    hours = int(hm.group(1)) if hm else 0
    mins  = int(mm.group(1)) if mm else 0
    if hours or mins:
        return hours * 60 + mins
    return None


class MovieStreamingResolveView(APIView):
    """
    Resolve a frontend movie id into the local Django Movie id used by streaming.
    """

    def get(self, request, movie_ref):
        try:
            movie = resolve_streaming_movie(movie_ref)
        except _ArchivePending:
            return Response(
                {
                    'status': 'pending',
                    'detail': 'Archive.org metadata is still being fetched — retry shortly',
                    'movie_ref': movie_ref,
                },
                status=202,
            )

        if not movie:
            return Response(
                {
                    'detail': 'Movie is not available in the local streaming catalog yet',
                    'movie_ref': movie_ref,
                },
                status=404,
            )

        return Response({
            'movie_id': movie.id,
            'title': movie.title,
            'stream_url': request.build_absolute_uri(f'/api/streaming/{movie.id}/stream/'),
            'subtitles_url': request.build_absolute_uri(f'/api/streaming/{movie.id}/subtitles/'),
        })


class MovieStreamView(APIView):
    """
    HLS Streaming endpoint

    GET /api/streaming/{movie_id}/stream/  → Return stream status + HLS playlist URL when ready

    Logic:
    1. Movie downloaded + HLS exists  → return ready + playlist URL
    2. Movie being downloaded         → return current status
    3. Not started                    → trigger download task + return downloading status
    4. Stale ready state              → reset + re-trigger download
    """

    def get(self, request, movie_id):
        from .tasks import download_and_segment
        try:
            try:
                movie = Movie.objects.get(id=movie_id)
            except Movie.DoesNotExist:
                logger.warning("Movie %s does not exist", movie_id)
                return Response({'detail': 'Movie not found'}, status=404)

            try:
                torrent = Torrent.objects.get(movie=movie)
            except Torrent.DoesNotExist:
                torrent = Torrent.objects.create(movie=movie, status='idle')
                print(f'[Streaming] Created torrent row for movie={movie_id}')

            torrent.last_accessed_at = timezone.now()
            torrent.save(update_fields=['last_accessed_at'])

            has_subs = movie.subtitles.exists()
            print(f'[Streaming] Movie {movie_id} | torrent_status={torrent.status} | has_subtitles={has_subs}')

            if torrent.status == "ready":
                hls_exists = bool(torrent.hls_path and os.path.exists(torrent.hls_path))
                video_exists = bool(torrent.video_path and os.path.exists(torrent.video_path))

                if not hls_exists:
                    print(
                        '[Streaming] Stale ready torrent detected; media files are missing. '
                        f'movie_id={movie_id} hls_path={torrent.hls_path} video_path={torrent.video_path}'
                    )
                    torrent.status = 'idle'
                    torrent.hls_path = None
                    if not video_exists:
                        torrent.video_path = None
                    torrent.save(update_fields=['status', 'hls_path', 'video_path'])
                else:
                    # Stream is ready — trigger subtitle preparation if not already done.
                    # enqueue_subtitle_preparation_once has its own dedup lock so calling
                    # it here on every status poll is safe and does not flood Celery.
                    from .tasks import enqueue_subtitle_preparation_once
                    enqueue_subtitle_preparation_once(
                        movie_id,
                        user_language=preferred_subtitle_language(request),
                        video_path=torrent.video_path if video_exists else None,
                    )

                    return Response({
                        'status': 'ready',
                        'movie_path': request.build_absolute_uri(
                            f'/api/streaming/{movie.id}/hls/playlist.m3u8'
                        ),
                    })
                
            if torrent.status not in ["downloading", "processing", 'error']:
                has_subs = movie.subtitles.exists()
                ready_subs = movie.subtitles.filter(status='ready').count()
                print(f'[Streaming] Triggering download | movie_id={movie_id} | subtitles_exist={has_subs} | ready_subtitles={ready_subs}')

            if torrent.status not in ["downloading", "processing", 'error']:
                print(f'[Streaming] Triggering download | movie_id={movie_id} torrent_status={torrent.status}')
                download_and_segment.delay(movie_id)

            return Response({'status': torrent.status, 'movie_path': None})

        except Exception as e:
            print(f'[Streaming] Unexpected error | movie_id={movie_id} error={e}')
            return Response({'status': 'error', 'message': 'An error occurred'}, status=500)


class MovieSubtitlesView(APIView):
    """
    Return ready subtitle tracks for a movie.

    Simplified: just query ready subtitles and return them.
    Subtitle preparation is triggered by MovieStreamView when the stream becomes
    ready — no need to trigger or poll it here.
    AllowAny: the VTT track list is not sensitive; browser fetches subtitle URLs
    directly without auth headers (same reasoning as HLS file views).
    """
    permission_classes = [AllowAny]

    def get(self, request, movie_id):
        if not Movie.objects.filter(id=movie_id).exists():
            return Response({'detail': 'Movie not found'}, status=404)

        subtitles = Subtitle.objects.filter(
            movie_id=movie_id,
            status=Subtitle.Status.READY,
        ).order_by('language', 'id')

        tracks = []
        seen_languages = set()
        for subtitle in subtitles:
            # Skip rows whose file was deleted from disk
            if not subtitle_asset_exists(subtitle):
                print(
                    '[Subtitles] Marking stale ready subtitle as failed; file missing on disk | '
                    f'movie_id={movie_id} subtitle_id={subtitle.id}'
                )
                mark_stale_ready_subtitle(subtitle)
                continue

            src = None
            if subtitle.file:
                src = request.build_absolute_uri(
                    f'/api/streaming/{movie_id}/subtitles/{subtitle.id}/file/'
                )
            elif subtitle.subtitle_link:
                src = subtitle.subtitle_link

            if not src:
                continue

            language = normalize_subtitle_language(subtitle.language) or subtitle.language

            # Old behavior: append every ready subtitle row.
            # That showed duplicate tracks when two subtitle tasks saved the
            # same OpenSubtitles result at almost the same time.
            if language in seen_languages:
                print(
                    '[Subtitles] Skipping duplicate subtitle track in API response | '
                    f'movie_id={movie_id} subtitle_id={subtitle.id} language={language}'
                )
                continue
            seen_languages.add(language)

            tracks.append({
                'id': subtitle.id,
                'language': language,
                'label': subtitle.label or subtitle.language.upper(),
                'src': src,
                'kind': 'subtitles',
                'source': subtitle.source,
            })
        
        print(f"[DEBUG] movie_id={movie_id} subtitle_count={subtitles.count()}")

        if not tracks:
            torrent = Torrent.objects.filter(movie_id=movie_id).first()
            video_exists = bool(torrent and torrent.video_path and os.path.exists(torrent.video_path))
            if video_exists:
                from .tasks import enqueue_subtitle_preparation_once

                print(
                    '[Subtitles] No usable English tracks; queueing preparation from subtitles API | '
                    f'movie_id={movie_id} video_path={torrent.video_path}'
                )
                enqueue_subtitle_preparation_once(
                    movie_id,
                    user_language=preferred_subtitle_language(request),
                    video_path=torrent.video_path,
                )

        print(f'[Subtitles] Subtitle API response | movie_id={movie_id} track_count={len(tracks)}')
        return Response(tracks)


class MovieHLSFileView(APIView):
    """
    Serve HLS playlists and segments through Django with stable browser headers.
    Must be AllowAny: hls.js fetches .m3u8 and .ts segments directly without
    auth headers, so authentication here would break video playback entirely.
    """
    permission_classes = [AllowAny]

    def get(self, request, movie_id, filename):
        torrent = Torrent.objects.filter(movie_id=movie_id).first()
        if not torrent or not torrent.hls_path:
            raise Http404('HLS stream not found')

        safe_name = os.path.basename(filename)
        hls_dir = os.path.dirname(torrent.hls_path)
        file_path = os.path.join(hls_dir, safe_name)
        content_type = 'application/vnd.apple.mpegurl' if safe_name.endswith('.m3u8') else 'video/mp2t'
        return media_file_response(file_path, content_type)


class MovieSubtitleFileView(APIView):
    """
    Serve WebVTT subtitle files through Django with stable browser headers.
    Must be AllowAny: browser <track> elements fetch subtitle files directly
    without auth headers, so authentication here would silently drop subtitles.
    """
    permission_classes = [AllowAny]

    def get(self, request, movie_id, subtitle_id):
        subtitle = Subtitle.objects.filter(
            id=subtitle_id,
            movie_id=movie_id,
            status=Subtitle.Status.READY,
        ).first()
        if not subtitle or not subtitle.file:
            raise Http404('Subtitle not found')

        return media_file_response(subtitle.file.path, 'text/vtt; charset=utf-8')
    
