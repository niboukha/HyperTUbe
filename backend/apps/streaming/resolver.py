"""
Movie resolver — converts a frontend movie reference (e.g. "archive-chaplin")
into a local Django Movie record, creating it on first access for archive /
public-domain sources.
"""
import logging
import re
from datetime import date

from apps.movies.models import Movie

logger = logging.getLogger(__name__)


class ArchivePending(Exception):
    """Archive.org metadata fetch timed out — movie exists but is not indexed yet."""
    pass


# ── Public entry point ────────────────────────────────────────────────────────

def resolve_streaming_movie(movie_ref: str) -> Movie | None:
    """
    Resolve a frontend movie reference to a local Movie instance.
    Creates the record on first access for archive/publicdomain sources.
    Raises ArchivePending if archive metadata is still being fetched.
    Returns None if the movie cannot be found or created.
    """
    movie_ref = str(movie_ref)

    # Numeric: DB pk lookup only — never create from a bare integer.
    if movie_ref.isdigit():
        return (
            Movie.objects.filter(id=int(movie_ref)).first()
            or Movie.objects.filter(tmdb_id=movie_ref).first()
        )

    # Prefixed canonical lookup first — avoids unnecessary external fetches.
    local_movie = Movie.objects.filter(tmdb_id=movie_ref).first()
    if local_movie:
        return local_movie

    if movie_ref.startswith("archive-"):
        archive_id = movie_ref.removeprefix("archive-")
        return (
            Movie.objects.filter(tmdb_id=archive_id).first()
            or _create_from_archive(archive_id)
        )

    if movie_ref.startswith("publicdomain-"):
        publicdomain_id = movie_ref.removeprefix("publicdomain-")
        return (
            Movie.objects.filter(tmdb_id=publicdomain_id).first()
            or _create_from_publicdomain(publicdomain_id)
        )

    # Bare string without a known prefix — assume archive.
    return (
        _create_from_archive(movie_ref)
        or _create_from_publicdomain(movie_ref)
    )


# ── Internal creators ─────────────────────────────────────────────────────────

def _create_from_archive(archive_id: str) -> Movie | None:
    import requests
    from apps.movies.adapters.archive import fetch_detail

    detail = fetch_detail(archive_id)
    if not detail:
        return None
    if detail.get("_pending"):
        raise ArchivePending(archive_id)

    torrent_url = f"https://archive.org/download/{archive_id}/{archive_id}_archive.torrent"

    try:
        metadata = requests.get(
            f"https://archive.org/metadata/{archive_id}", timeout=10
        ).json()
    except Exception as exc:
        logger.warning(
            "[Streaming] Could not fetch Archive metadata; using fallback torrent URL | "
            "archive_id=%s torrent_url=%s error=%s", archive_id, torrent_url, exc
        )
        metadata = {}
    else:
        for file_info in metadata.get("files", []):
            name = file_info.get("name", "")
            if name.endswith(".torrent"):
                torrent_url = f"https://archive.org/download/{archive_id}/{name}"
                break

    movie, _ = Movie.objects.get_or_create(
        tmdb_id=f"archive-{archive_id}",
        defaults={
            "title":        detail.get("title") or archive_id,
            "overview":     detail.get("overview") or "",
            "poster_url":   detail.get("poster_path") or "",
            "backdrop_url": detail.get("backdrop_path") or "",
            "release_date": _parse_release_year(detail.get("year") or detail.get("release_date")),
            "rating":       detail.get("rating") or 0,
            "duration":     _runtime_to_minutes(detail.get("runtime")),
            "is_watchable": True,
            "torrent_url":  torrent_url,
        },
    )
    logger.info("[Streaming] Created Archive movie | movie_id=%s archive_id=%s", movie.id, archive_id)
    return movie


def _create_from_publicdomain(publicdomain_id: str) -> Movie | None:
    from apps.movies.adapters.publicdomain import fetch_detail

    detail = fetch_detail(publicdomain_id)
    if not detail:
        return None

    torrent_files = detail.get("torrent_files") or []
    if not torrent_files:
        logger.warning("[Streaming] PublicDomain movie has no torrent | publicdomain_id=%s", publicdomain_id)
        return None

    movie, _ = Movie.objects.get_or_create(
        tmdb_id=f"publicdomain-{publicdomain_id}",
        defaults={
            "title":        detail.get("title") or publicdomain_id,
            "overview":     detail.get("overview") or "",
            "poster_url":   detail.get("poster_path") or "",
            "backdrop_url": detail.get("backdrop_path") or "",
            "release_date": None,
            "rating":       detail.get("rating") or 0,
            "duration":     _runtime_to_minutes(detail.get("runtime")),
            "is_watchable": True,
            "torrent_url":  torrent_files[0].get("url") or "",
        },
    )
    logger.info("[Streaming] Created PublicDomain movie | movie_id=%s publicdomain_id=%s", movie.id, publicdomain_id)
    return movie


# ── Utilities ─────────────────────────────────────────────────────────────────

def _parse_release_year(value) -> date | None:
    if not value:
        return None
    try:
        return date(int(str(value)[:4]), 1, 1)
    except Exception:
        return None


def _runtime_to_minutes(value) -> int | None:
    if not value:
        return None
    s = str(value).strip()
    if s.isdigit():
        return int(s)
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
    hm = re.search(r"(\d+)\s*h", s, re.IGNORECASE)
    mm = re.search(r"(\d+)\s*m", s, re.IGNORECASE)
    hours = int(hm.group(1)) if hm else 0
    mins  = int(mm.group(1)) if mm else 0
    if hours or mins:
        return hours * 60 + mins
    return None
