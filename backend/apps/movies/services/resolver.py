"""
Content Resolution Layer
========================
Resolves a (movie_id, language) pair into localized display metadata
by delegating to the appropriate provider adapter at runtime.

Responsibilities:
- Route by ID prefix (tmdb- / archive- / publicdomain-)
- Apply English fallback when a TMDB localized title/overview is absent
- Parallel-resolve a full watchlist in one thread pool burst
- Never read or write language-specific text from/to the database

The Movie DB model is used only as a relational anchor (FK target for
UserMovieState). Its title/overview columns serve as a last-resort fallback
if the provider call fails entirely — they are never the primary source.
"""
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

logger = logging.getLogger(__name__)

VALID_LANGUAGES = {"en", "fr", "es"}


# ---------------------------------------------------------------------------
# Internal helpers per provider
# ---------------------------------------------------------------------------

def _pick_fields(data: dict) -> dict:
    """Extract the six display fields from any normalized adapter response."""
    return {
        "title":         data.get("title", ""),
        "overview":      data.get("overview", ""),
        "poster_path":   data.get("poster_path"),
        "backdrop_path": data.get("backdrop_path"),
        "year":          data.get("year"),
        "rating":        data.get("rating"),
    }


def _resolve_tmdb(tmdb_id: int, language: str) -> Optional[dict]:
    """
    Fetch TMDB metadata in `language`.  If the localized response has no
    title or overview (TMDB returns empty strings for unsupported locales),
    transparently patch those fields from the English response.
    """
    from ..adapters.tmdb import fetch_detail

    data = fetch_detail(tmdb_id, language)
    if data is None:
        return None

    fields = _pick_fields(data)

    if language != "en" and (not fields["title"] or not fields["overview"]):
        en = fetch_detail(tmdb_id, "en")
        if en:
            en_fields = _pick_fields(en)
            fields["title"]         = fields["title"]         or en_fields["title"]
            fields["overview"]      = fields["overview"]      or en_fields["overview"]
            fields["poster_path"]   = fields["poster_path"]   or en_fields["poster_path"]
            fields["backdrop_path"] = fields["backdrop_path"] or en_fields["backdrop_path"]

    return fields


def _resolve_archive(archive_id: str, language: str) -> Optional[dict]:
    """
    Archive.org publishes English-only metadata.
    The language parameter is accepted for interface uniformity but ignored.
    """
    from ..adapters.archive import fetch_detail

    data = fetch_detail(archive_id)
    return _pick_fields(data) if data else None


def _resolve_publicdomain(pd_id: str, language: str) -> Optional[dict]:
    """
    Public Domain Torrents publishes English-only metadata.
    The language parameter is accepted for interface uniformity but ignored.
    """
    from ..adapters.publicdomain import fetch_detail

    data = fetch_detail(pd_id)
    return _pick_fields(data) if data else None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def resolve_movie_content(movie_id: str, language: str = "en") -> Optional[dict]:
    """
    Return localized display content for *movie_id* in *language*.

    Returns a dict with keys:
        title, overview, poster_path, backdrop_path, year, rating

    Returns None only if the provider call fails completely (network error,
    unknown ID, etc.).  Partial results (e.g. English fallback for a French
    request) are still returned — callers should treat them as best-effort.
    """
    if language not in VALID_LANGUAGES:
        language = "en"

    try:
        if movie_id.startswith("tmdb-"):
            raw = movie_id.removeprefix("tmdb-")
            return _resolve_tmdb(int(raw), language) if raw.isdigit() else None

        if movie_id.startswith("archive-"):
            return _resolve_archive(movie_id.removeprefix("archive-"), language)

        if movie_id.startswith("publicdomain-"):
            return _resolve_publicdomain(movie_id.removeprefix("publicdomain-"), language)

    except Exception:
        logger.exception("resolve_movie_content failed: movie_id=%s lang=%s", movie_id, language)

    return None


def resolve_watchlist_items(states, language: str = "en") -> list[dict]:
    """
    Resolve a queryset of UserMovieState rows into language-correct watchlist
    items, fetching provider metadata in parallel.

    For each item the resolution priority is:
        1. Provider API in requested language  (live, cached by adapter)
        2. English provider fallback           (automatic for TMDB)
        3. DB-stored snapshot                  (last resort, may be stale/wrong lang)
    """
    states_list = list(states)
    if not states_list:
        return []

    def _resolve_one(state) -> dict:
        movie_id = state.movie.tmdb_id
        try:
            content = resolve_movie_content(movie_id, language)
        except Exception:
            content = None

        c = content or {}
        return {
            "movie_id":      movie_id,
            "title":         c.get("title")         or state.movie.title,
            "overview":      c.get("overview")      or state.movie.overview,
            "poster_path":   c.get("poster_path")   or state.movie.poster_url,
            "backdrop_path": c.get("backdrop_path") or state.movie.backdrop_url,
            "year": (
                c.get("year")
                or (str(state.movie.release_date.year) if state.movie.release_date else None)
            ),
            "rating":   c.get("rating") or state.movie.rating,
            "added_at": (state.created_at or state.updated_at).isoformat(),
        }

    with ThreadPoolExecutor(max_workers=min(len(states_list), 10)) as pool:
        results = list(pool.map(_resolve_one, states_list))

    return [r for r in results if r is not None]
