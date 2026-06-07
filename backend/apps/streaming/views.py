import os
import logging
from datetime import date

from django.http import FileResponse, Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes

from django.utils import timezone
from apps.movies.models import Movie
from .models import  Subtitle, Torrent

logger = logging.getLogger(__name__)


def media_file_response(path, content_type):
    if not path or not os.path.exists(path):
        raise Http404('Media file not found')

    response = FileResponse(open(path, 'rb'), content_type=content_type)
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

def resolve_streaming_movie(movie_ref):
    movie_ref = str(movie_ref)

    if str(movie_ref).isdigit():
        return (
            Movie.objects.filter(id=int(movie_ref)).first()
            or Movie.objects.filter(tmdb_id=movie_ref).first()
            or create_streaming_movie_from_publicdomain(movie_ref)
            or create_streaming_movie_from_archive(movie_ref)
        )

    local_movie = Movie.objects.filter(tmdb_id=movie_ref).first()
    if local_movie:
        return local_movie

    if movie_ref.startswith('archive-'):
        archive_id = movie_ref.removeprefix('archive-')
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

    return (
        create_streaming_movie_from_archive(movie_ref)
        or create_streaming_movie_from_publicdomain(movie_ref)
    )


def create_streaming_movie_from_archive(archive_id):
    from apps.movies.adapters.archive import fetch_detail
    import requests

    detail = fetch_detail(archive_id)
    if not detail or detail.get('_pending'):
        return None

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
        tmdb_id=archive_id,
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
        tmdb_id=publicdomain_id,
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
    digits = ''.join(ch for ch in str(value) if ch.isdigit())
    return int(digits) if digits else None

@permission_classes([AllowAny])
class MovieStreamingResolveView(APIView):
    """
    Resolve a frontend movie id into the local Django Movie id used by streaming.
    """

    def get(self, request, movie_ref):
        movie = resolve_streaming_movie(movie_ref)
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

@permission_classes([AllowAny])
class MovieStreamView(APIView):
    """
    HLS Streaming endpoint

    GET /api/hls/{movie_id}/playlist.m3u8  → Return HLS playlist
    GET /api/hls/{movie_id}/{segment}.ts   → Return .ts segment

    Logic:
    1. Movie downloaded + .mp4    → Generate HLS + serve playlist
    2. Movie downloaded + .mkv    → Convert (Celery) + serve when ready
    3. Not downloaded             → Start download (Celery) + serve partial HLS
    4. Path in DB but file missing → Reset + re-trigger download
    """

    def get(self, request, movie_id):
        """
        Serve HLS playlist or segment
        filename = 'playlist.m3u8' or 'segment0.ts', 'segment1.ts' etc.
        """
        from .tasks import download_and_segment
        try:
            # movie = Movie.objects.get(id=movie_id)
            try:
                movie = Movie.objects.get(id=movie_id)
            except Movie.DoesNotExist:
                logger.warning("Movie %s does not exist", movie_id)
                return Response({'detail': 'Movie not found'}, status=404)
            try:
                torrent = Torrent.objects.get(movie=movie)
            except Torrent.DoesNotExist:
                torrent = Torrent.objects.create(movie=movie, status='idle')
                print(f'[Subtitles] Created torrent row for movie={movie_id}; subtitle prep waits for video download')

            torrent.last_accessed_at = timezone.now()
            torrent.save(update_fields=['last_accessed_at'])

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
                    from .tasks import enqueue_subtitle_preparation_once
                    print(f'[Subtitles] Stream ready; enqueueing subtitle prep if needed | movie_id={movie_id} video_path={torrent.video_path}')
                    enqueue_subtitle_preparation_once(movie_id, video_path=torrent.video_path if video_exists else None)

                    return Response({
                        'status': 'ready',
                        'movie_path': request.build_absolute_uri(
                            f'/api/streaming/{movie.id}/hls/playlist.m3u8'
                        ),
                    })

            if torrent.status not in ["downloading", "processing", 'error']:
                print(f'[Subtitles] Stream requested; movie not ready yet | movie_id={movie_id} torrent_status={torrent.status}')
                download_and_segment.delay(movie_id)
            return Response({'status': torrent.status, 'movie_path': None})
            
        except Torrent.DoesNotExist:
            print(f"==============> Torrent with movie_id {movie_id} not found")
            # torrent = Torrent.objects.create(movie=movie)
            return Response({'status': 'error', 'message': 'Torrent not found'}, status=204)
        except Exception as e:
            print(f"==============>Error in MovieStreamView: {e}")
            return Response({'status': 'error', 'message': 'An error occurred'}, status=500)
            
@permission_classes([AllowAny])
class MovieSubtitlesView(APIView):
    """
    Return ready subtitle tracks for a movie.
    """
    def get(self, request, movie_id):
        if not Movie.objects.filter(id=movie_id).exists():
            return Response({'detail': 'Movie not found'}, status=404)

        from django.core.cache import cache
        from .tasks import (
            enqueue_subtitle_preparation_once,
            expire_stale_ready_subtitles,
        )

        stale_count = expire_stale_ready_subtitles(movie_id)
        if stale_count:
            cache.delete(f'subtitles:prepare:{movie_id}:default')

        subtitles = Subtitle.objects.filter(
            movie_id=movie_id,
            status=Subtitle.Status.READY,
        ).order_by('language', 'id')

        tracks = []
        for subtitle in subtitles:
            src = None
            if subtitle.file:
                if not subtitle.file.storage.exists(subtitle.file.name):
                    print(
                        '[Subtitles] Skipping stale subtitle file; DB row exists but media file is missing | '
                        f'movie_id={movie_id} subtitle_id={subtitle.id} file={subtitle.file.name}'
                    )
                    continue
                src = request.build_absolute_uri(
                    f'/api/streaming/{movie_id}/subtitles/{subtitle.id}/file/'
                )
            elif subtitle.subtitle_link:
                src = subtitle.subtitle_link

            if not src:
                continue

            tracks.append({
                'id': subtitle.id,
                'language': subtitle.language,
                'label': subtitle.label or subtitle.language.upper(),
                'src': src,
                'kind': 'subtitles',
                'source': subtitle.source,
            })

        if not tracks:
            torrent = Torrent.objects.filter(movie_id=movie_id).first()
            video_exists = bool(torrent and torrent.video_path and os.path.exists(torrent.video_path))
            if video_exists:
                print(
                    '[Subtitles] No usable subtitle tracks; queueing preparation from subtitles API | '
                    f'movie_id={movie_id} video_path={torrent.video_path}'
                )
                enqueue_subtitle_preparation_once(movie_id, video_path=torrent.video_path)
            else:
                print(
                    '[Subtitles] No usable subtitle tracks and no local video yet | '
                    f'movie_id={movie_id}'
                )

        print(f'[Subtitles] Subtitle API response | movie_id={movie_id} track_count={len(tracks)}')
        return Response(tracks)


@permission_classes([AllowAny])
class MovieHLSFileView(APIView):
    """
    Serve HLS playlists and segments through Django with stable browser headers.
    """
    def get(self, request, movie_id, filename):
        torrent = Torrent.objects.filter(movie_id=movie_id).first()
        if not torrent or not torrent.hls_path:
            raise Http404('HLS stream not found')

        safe_name = os.path.basename(filename)
        hls_dir = os.path.dirname(torrent.hls_path)
        file_path = os.path.join(hls_dir, safe_name)
        content_type = 'application/vnd.apple.mpegurl' if safe_name.endswith('.m3u8') else 'video/mp2t'
        return media_file_response(file_path, content_type)


@permission_classes([AllowAny])
class MovieSubtitleFileView(APIView):
    """
    Serve WebVTT subtitle files through Django with stable browser headers.
    """
    def get(self, request, movie_id, subtitle_id):
        subtitle = Subtitle.objects.filter(
            id=subtitle_id,
            movie_id=movie_id,
            status=Subtitle.Status.READY,
        ).first()
        if not subtitle or not subtitle.file:
            raise Http404('Subtitle not found')

        return media_file_response(subtitle.file.path, 'text/vtt; charset=utf-8')
