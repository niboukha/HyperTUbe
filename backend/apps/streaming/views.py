import os
import logging

from django.http import Http404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from apps.movies.models import Movie
from .models import Subtitle, Torrent
from .resolver import ArchivePending, resolve_streaming_movie
from .subtitles import normalize_subtitle_language
from .tasks import download_and_segment, enqueue_subtitle_preparation_once
from .utils import (
    media_file_response,
    preferred_subtitle_language,
    subtitle_asset_exists,
    mark_stale_subtitle,
)

logger = logging.getLogger(__name__)


class MovieStreamingResolveView(APIView):
    """
    GET /streaming/resolve/<movie_ref>/
    Resolve a frontend movie ID into the local Django Movie ID used by streaming.
    Returns 202 while archive metadata is still being fetched.
    """

    def get(self, request, movie_ref):
        try:
            movie = resolve_streaming_movie(movie_ref)
        except ArchivePending:
            return Response(
                {
                    "status": "pending",
                    "detail": "Archive.org metadata is still being fetched — retry shortly",
                    "movie_ref": movie_ref,
                },
                status=202,
            )

        if not movie:
            return Response(
                {
                    "detail": "Movie is not available in the local streaming catalog yet",
                    "movie_ref": movie_ref,
                },
                status=404,
            )

        from apps.movies.services.resolver import resolve_movie_content
        language = getattr(request, "lang", "en")
        content  = resolve_movie_content(movie.tmdb_id, language) or {}

        return Response({
            "movie_id":     movie.id,
            "title":        content.get("title") or movie.title,
            "stream_url":   request.build_absolute_uri(f"/streaming/{movie.id}/stream/"),
            "subtitles_url": request.build_absolute_uri(f"/streaming/{movie.id}/subtitles/"),
        })


class MovieStreamView(APIView):
    """
    GET /streaming/<movie_id>/stream/
    Returns stream status. Triggers download on first call.
    Triggers subtitle preparation once the stream is ready.
    """

    def get(self, request, movie_id):
        try:
            try:
                movie = Movie.objects.get(id=movie_id)
            except Movie.DoesNotExist:
                return Response({"detail": "Movie not found"}, status=404)

            torrent, created = Torrent.objects.get_or_create(movie=movie, defaults={"status": "idle"})
            if created:
                logger.info("[Streaming] Created torrent row | movie_id=%s", movie_id)

            torrent.last_accessed_at = timezone.now()
            torrent.save(update_fields=["last_accessed_at"])

            if torrent.status == "ready":
                hls_exists   = bool(torrent.hls_path and os.path.exists(torrent.hls_path))
                video_exists = bool(torrent.video_path and os.path.exists(torrent.video_path))

                if hls_exists:
                    enqueue_subtitle_preparation_once(
                        movie_id,
                        user_language=preferred_subtitle_language(request),
                        video_path=torrent.video_path if video_exists else None,
                    )

                return Response({
                    "status":     "ready",
                    "movie_path": torrent.hls_path if hls_exists else None,
                })

            # if torrent.status not in ("downloading", "processing", "error"):
            if torrent.status == "idle":
                logger.info("[Streaming] Triggering download | movie_id=%s", movie_id)
                download_and_segment.delay(movie_id)

            return Response({"status": torrent.status, "movie_path": None})

        except Exception as exc:
            logger.exception("[Streaming] Unexpected error | movie_id=%s", movie_id)
            return Response({"status": "error", "message": "An error occurred"}, status=500)


class MovieSubtitlesView(APIView):
    """
    GET /streaming/<movie_id>/subtitles/
    Returns ready subtitle tracks. Triggers preparation if none exist yet.
    AllowAny: browser <track> elements fetch subtitle URLs without auth headers.
    """
    permission_classes = [AllowAny]

    def get(self, request, movie_id):
        if not Movie.objects.filter(id=movie_id).exists():
            return Response({"detail": "Movie not found"}, status=404)

        subtitles = Subtitle.objects.filter(
            movie_id=movie_id,
            status=Subtitle.Status.READY,
        ).order_by("language", "id")

        tracks = []
        seen_languages: set[str] = set()

        for subtitle in subtitles:
            if not subtitle_asset_exists(subtitle):
                logger.warning(
                    "[Subtitles] Stale subtitle — marking failed | movie_id=%s subtitle_id=%s",
                    movie_id, subtitle.id,
                )
                mark_stale_subtitle(subtitle)
                continue

            src = None
            if subtitle.file:
                src = request.build_absolute_uri(
                    f"/streaming/{movie_id}/subtitles/{subtitle.id}/file/"
                )
            elif subtitle.subtitle_link:
                src = subtitle.subtitle_link

            if not src:
                continue

            language = normalize_subtitle_language(subtitle.language) or subtitle.language

            if language in seen_languages:
                logger.debug(
                    "[Subtitles] Skipping duplicate track | movie_id=%s subtitle_id=%s language=%s",
                    movie_id, subtitle.id, language,
                )
                continue
            seen_languages.add(language)

            tracks.append({
                "id":       subtitle.id,
                "language": language,
                "label":    subtitle.label or subtitle.language.upper(),
                "src":      src,
                "kind":     "subtitles",
                "source":   subtitle.source,
            })

        if not tracks:
            torrent = Torrent.objects.filter(movie_id=movie_id).first()
            video_exists = bool(
                torrent and torrent.video_path and os.path.exists(torrent.video_path)
            )
            if video_exists:
                enqueue_subtitle_preparation_once(
                    movie_id,
                    user_language=preferred_subtitle_language(request),
                    video_path=torrent.video_path,
                )

        logger.info("[Subtitles] Response | movie_id=%s track_count=%d", movie_id, len(tracks))
        return Response(tracks)


class MovieHLSFileView(APIView):
    """
    GET /streaming/<movie_id>/hls/<filename>
    Serve HLS playlists and segments.
    AllowAny: hls.js fetches segments without auth headers.
    """
    permission_classes = [AllowAny]

    def get(self, request, movie_id, filename):
        torrent = Torrent.objects.filter(movie_id=movie_id).first()
        if not torrent or not torrent.hls_path:
            raise Http404("HLS stream not found")

        safe_name  = os.path.basename(filename)
        hls_dir    = os.path.dirname(torrent.hls_path)
        file_path  = os.path.join(hls_dir, safe_name)
        content_type = (
            "application/vnd.apple.mpegurl" if safe_name.endswith(".m3u8") else "video/mp2t"
        )
        return media_file_response(file_path, content_type)


class MovieSubtitleFileView(APIView):
    """
    GET /streaming/<movie_id>/subtitles/<subtitle_id>/file/
    Serve WebVTT subtitle files.
    AllowAny: browser <track> elements fetch without auth headers.
    """
    permission_classes = [AllowAny]

    def get(self, request, movie_id, subtitle_id):
        subtitle = Subtitle.objects.filter(
            id=subtitle_id,
            movie_id=movie_id,
            status=Subtitle.Status.READY,
        ).first()
        if not subtitle or not subtitle.file:
            raise Http404("Subtitle not found")

        return media_file_response(subtitle.file.path, "text/vtt; charset=utf-8")
