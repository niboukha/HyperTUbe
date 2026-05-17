import logging
from ..adapters import tmdb, archive
from .utils import _shuffle_merge

logger = logging.getLogger(__name__)


def library_search(query: str = "", genre_ids: list = None, year_from: int = None,
                   year_to: int = None, min_rating: float = 0,
                   sort_by: str = "popularity", page: int = 1,
                   page_size: int = 20) -> dict:
    """
    Powers /movies/ endpoint (non-streaming, used for scroll pages 2+).
    
    Strategy:
    - TMDB: always fetched live (fast ~300ms)
    - Archive: read from cache only (Celery fills it in background)
    - Page 1 without archive: NOT cached (forces retry on next request)
    - Page 2+: archive from cache or fallback to page 1 cache
    """
    from ..cache.movie_cache import (
        get_search_results, set_search_results,
        get_archive_search, TTL_SEARCH_RESULTS,
    )

    lib_key = _make_cache_key(query, genre_ids, year_from, year_to,
                               min_rating, sort_by, page)
    cached = get_search_results(lib_key, source="library")
    if cached:
        return cached

    genre_key = ",".join(str(g) for g in sorted(genre_ids or []))

    # For scroll pages 2+, try the matching archive page first, then fall back to page 1
    # This ensures scroll pages show different archive results when available
    archive_cached = (
        get_archive_search(query or "", genre_key, page)
        or (get_archive_search(query or "", genre_key, 1) if page > 1 else None)
    )

    # TMDB always fetched live
    tmdb_data    = tmdb.search(query=query, genre_ids=genre_ids,
                                year_from=year_from, year_to=year_to,
                                sort_by=sort_by, page=page)
    tmdb_results = tmdb_data.get("results", [])

    if archive_cached is not None:
        archive_results = archive_cached.get("results", [])
        archive_pages   = archive_cached.get("total_pages", 1)
    else:
        archive_results = []
        archive_pages   = 1
        # Queue page 1, it will chain-queue pages 2-5 automatically
        if not query or len(query.strip()) >= 2:
            _queue_archive(query, genre_ids, page=1)

    # Apply filters
    if min_rating > 0:
        tmdb_results    = [m for m in tmdb_results
                           if float(m.get("rating") or 0) >= min_rating]
        archive_results = [m for m in archive_results
                           if float(m.get("rating") or 0) >= min_rating]

    # Sort TMDB results, then append archive at end
    sort_fns = {
        "vote_average":              lambda m: float(m.get("rating") or 0),
        "rating":                    lambda m: float(m.get("rating") or 0),
        "primary_release_date_desc": lambda m: m.get("year") or "0",
        "primary_release_date_asc":  lambda m: m.get("year") or "9999",
    }
    if sort_by in sort_fns:
        tmdb_results.sort(key=sort_fns[sort_by], reverse="asc" not in sort_by)

    # Archive appended at end, clearly a secondary source
    results     = tmdb_results + archive_results
    total_pages = max(tmdb_data.get("total_pages", 1), archive_pages, 1)

    result = {
        "results":          results,
        "page":             page,
        "totalPages":       total_pages,
        "has_more":         page < total_pages,
        "archive_included": bool(archive_results),
    }

    # Don't cache page 1 without archive, let next request retry
    # Cache other pages even without archive (they're scroll pages, TMDB-only is fine)
    if page == 1 and not archive_results:
        return result

    ttl = TTL_SEARCH_RESULTS if archive_results else 30
    set_search_results(lib_key, result, source="library", ttl=ttl)
    return result


def _queue_archive(query: str, genre_ids: list | None, page: int = 1) -> None:
    if query and len(query.strip()) < 2:
        return
    try:
        from ..tasks import search_archive_task
        search_archive_task.delay(query or "", page, genre_ids or [])
    except Exception as e:
        logger.warning("_queue_archive failed: %s", e)


def _make_cache_key(query, genre_ids, year_from, year_to,
                     min_rating, sort_by, page) -> str:
    """Unique string for this exact filter combination."""
    return ":".join([
        (query or "").lower().strip(),
        ",".join(str(g) for g in sorted(genre_ids or [])),
        str(year_from or ""),
        str(year_to or ""),
        str(min_rating),
        sort_by,
        str(page),
    ])




# import logging
# from ..adapters import tmdb, archive
# from .utils import _shuffle_merge

# logger = logging.getLogger(__name__)
# def library_search(query: str = "", genre_ids: list = None, year_from: int = None,
#                    year_to: int = None, min_rating: float = 0,
#                    sort_by: str = "popularity", page: int = 1,
#                    page_size: int = 20) -> dict:

#     from ..cache.movie_cache import (
#         get_search_results, set_search_results,
#         get_archive_search, TTL_SEARCH_RESULTS,
#     )

#     lib_key = _library_cache_key(query, genre_ids, year_from, year_to, min_rating, sort_by, page)
#     cached  = get_search_results(lib_key, source="library")
#     if cached:
#         return cached

#     genre_key = ",".join(str(g) for g in sorted(genre_ids or []))

#     # Read archive page matching current scroll page
#     # Page 1 -> archive page 1, page 2 -> archive page 2, etc.
#     # Falls back to page 1 if requested page not cached yet
#     archive_cached = (
#         get_archive_search(query or "", genre_key, page)
#         or get_archive_search(query or "", genre_key, 1)
#     )

#     # TMDB
#     tmdb_data    = tmdb.search(
#         query=query, genre_ids=genre_ids,
#         year_from=year_from, year_to=year_to,
#         sort_by=sort_by, page=page,
#     )
#     tmdb_results = tmdb_data.get("results", [])

#     # Archive from cache
#     if archive_cached is not None:
#         archive_results = archive_cached.get("results", [])
#         archive_pages   = archive_cached.get("total_pages", 1)
#     else:
#         archive_results = []
#         archive_pages   = 1
        
#         _queue_archive_search(query, genre_ids, page=1)

#     merged = _shuffle_merge(tmdb_results, archive_results)

#     if min_rating > 0:
#         merged = [m for m in merged if float(m.get("rating") or 0) >= min_rating]
#         archive_results = [
#             m for m in archive_results
#             if float(m.get("rating") or 0) >= min_rating
#         ]

#     sort_keys = {
#         "vote_average":              lambda m: float(m.get("rating") or 0),
#         "rating":                    lambda m: float(m.get("rating") or 0),
#         "primary_release_date_desc": lambda m: m.get("year") or "0",
#         "primary_release_date_asc":  lambda m: m.get("year") or "9999",
#     }
#     if sort_by in sort_keys:
#         merged.sort(key=sort_keys[sort_by], reverse="asc" not in sort_by)

#     # Archive appended at end — different per page because task caches each page
#     # merged = merged + archive_results

#     total_pages = max(tmdb_data.get("total_pages", 1), archive_pages, 1)

#     result = {
#         "results":          merged,
#         "page":             page,
#         "totalPages":       total_pages,
#         "has_more":         page < total_pages,
#         "archive_included": bool(archive_results),
#     }

#     if page == 1 and not archive_results:
#         return result

#     ttl = TTL_SEARCH_RESULTS if archive_results else 20
#     set_search_results(lib_key, result, source="library", ttl=ttl)
#     return result


# def _queue_archive_search(query: str, genre_ids: list, page: int = 1) -> None:
#     try:
#         from ..tasks import search_archive_task
#         search_archive_task.delay(query or "", page, genre_ids or [])
#     except Exception as e:
#         logger.warning("failed to queue archive search: %s", e)


# def _library_cache_key(query, genre_ids, year_from, year_to,
#                         min_rating, sort_by, page) -> str:
#     return ":".join([
#         (query or "").lower().strip(),
#         ",".join(str(g) for g in sorted(genre_ids or [])),
#         str(year_from or ""),
#         str(year_to or ""),
#         str(min_rating),
#         sort_by,
#         str(page),
#     ])
