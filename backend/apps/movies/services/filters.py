import logging
from ..adapters import tmdb, archive
from .utils import _shuffle_merge

logger = logging.getLogger(__name__)
def library_search(query: str = "", genre_ids: list = None, year_from: int = None,
                   year_to: int = None, min_rating: float = 0,
                   sort_by: str = "popularity", page: int = 1,
                   page_size: int = 20) -> dict:

    from ..cache.movie_cache import (
        get_search_results, set_search_results,
        get_archive_search, TTL_SEARCH_RESULTS,
    )

    lib_key = _library_cache_key(query, genre_ids, year_from, year_to,
                                  min_rating, sort_by, page)
    cached  = get_search_results(lib_key, source="library")
    if cached:
        return cached

    genre_key = ",".join(str(g) for g in sorted(genre_ids or []))

    # Read archive page matching current scroll page
    # Page 1 → archive page 1, page 2 → archive page 2, etc.
    # Falls back to page 1 if requested page not cached yet
    archive_cached = (
        get_archive_search(query or "", genre_key, page)
        or get_archive_search(query or "", genre_key, 1)   # fallback to page 1
    )

    # TMDB
    tmdb_data    = tmdb.search(
        query=query, genre_ids=genre_ids,
        year_from=year_from, year_to=year_to,
        sort_by=sort_by, page=page,
    )
    tmdb_results = tmdb_data.get("results", [])

    # Archive from cache
    if archive_cached is not None:
        archive_results = archive_cached.get("results", [])
        archive_pages   = archive_cached.get("total_pages", 1)
    else:
        archive_results = []
        archive_pages   = 1
        # Queue page 1 first — it will chain-queue subsequent pages
        _queue_archive_search(query, genre_ids, page=1)

    # Merge: TMDB first, archive appended
    merged = list(tmdb_results)

    if min_rating > 0:
        merged = [m for m in merged if float(m.get("rating") or 0) >= min_rating]
        archive_results = [
            m for m in archive_results
            if float(m.get("rating") or 0) >= min_rating
        ]

    sort_keys = {
        "vote_average":              lambda m: float(m.get("rating") or 0),
        "rating":                    lambda m: float(m.get("rating") or 0),
        "primary_release_date_desc": lambda m: m.get("year") or "0",
        "primary_release_date_asc":  lambda m: m.get("year") or "9999",
    }
    if sort_by in sort_keys:
        merged.sort(key=sort_keys[sort_by], reverse="asc" not in sort_by)

    # Archive appended at end — different per page because task caches each page
    merged = merged + archive_results

    total_pages = max(tmdb_data.get("total_pages", 1), archive_pages, 1)

    result = {
        "results":          merged,
        "page":             page,
        "totalPages":       total_pages,
        "has_more":         page < total_pages,
        "archive_included": bool(archive_results),
    }

    # Don't cache page 1 without archive — retry will get enriched result
    if page == 1 and not archive_results:
        return result

    ttl = TTL_SEARCH_RESULTS if archive_results else 20
    set_search_results(lib_key, result, source="library", ttl=ttl)
    return result


def _queue_archive_search(query: str, genre_ids: list, page: int = 1) -> None:
    try:
        from ..tasks import search_archive_task
        search_archive_task.delay(query or "", page, genre_ids or [])
    except Exception as e:
        logger.warning("failed to queue archive search: %s", e)


def _library_cache_key(query, genre_ids, year_from, year_to,
                        min_rating, sort_by, page) -> str:
    return ":".join([
        (query or "").lower().strip(),
        ",".join(str(g) for g in sorted(genre_ids or [])),
        str(year_from or ""),
        str(year_to or ""),
        str(min_rating),
        sort_by,
        str(page),
    ])