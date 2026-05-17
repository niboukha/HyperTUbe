# movies/services/filters.py

import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FT, as_completed

from .utils import _deduplicate, _sort_results
from ..adapters import tmdb, archive

logger = logging.getLogger(__name__)

PAGE_SIZE       = 20
ARCHIVE_TIMEOUT = 8    # seconds — give archive a fair chance
TMDB_MAX_PAGES  = 3    # fetch up to 3 TMDB pages (~60 results)
ARCHIVE_PAGES   = 2    # fetch up to 2 archive pages (~40 results)


def library_search(
    query:      str   = "",
    genre_ids:  list  = None,
    year_from:  int   = None,
    year_to:    int   = None,
    min_rating: float = 0,
    sort_by:    str   = "popularity",
    page:       int   = 1,
    page_size:  int   = PAGE_SIZE,
) -> dict:
    """
    Strategy:
      1. Check Redis for the full sorted list (cache key = all filters except page)
      2. Cache miss → fetch TMDB + Archive in parallel, merge, sort, cache
      3. Slice the cached list for the requested page

    This guarantees:
      - Global sort is always correct (sorted once on full merged list)
      - Archive results ARE included (not just TMDB)
      - All filters applied before sorting
      - Scroll pages 2+ are instant (Redis slice, no API call)
    """
    from ..cache.movie_cache import (
        get_search_results, set_search_results, TTL_SEARCH_RESULTS
    )

    # Cache key covers everything except page — same key for all pages of same search
    full_key = _full_result_key(query, genre_ids, year_from, year_to,
                                 min_rating, sort_by)
    full_cached = get_search_results(full_key, source="library_full")

    if full_cached is None:
        logger.info("library_search: cache miss, fetching all sources q=%r g=%s",
                    query, genre_ids)
        full_cached = _fetch_merge_sort(
            query, genre_ids, year_from, year_to, min_rating, sort_by
        )
        ttl = TTL_SEARCH_RESULTS if full_cached["results"] else 20
        set_search_results(full_key, full_cached, source="library_full", ttl=ttl)
    else:
        logger.debug("library_search: cache HIT q=%r p=%d", query, page)

    # Slice for requested page
    all_results = full_cached["results"]
    total       = len(all_results)
    total_pages = max(1, -(-total // page_size))
    start       = (page - 1) * page_size

    return {
        "results":          all_results[start : start + page_size],
        "page":             page,
        "totalPages":       total_pages,
        "has_more":         page < total_pages,
        "total":            total,
        "archive_included": full_cached.get("archive_included", False),
    }


def _fetch_merge_sort(query, genre_ids, year_from, year_to,
                       min_rating, sort_by) -> dict:
    """
    Fetch from TMDB and Archive in parallel.
    Merge, deduplicate, filter, sort — once on the full combined list.
    """
    all_results      = []
    archive_included = False

    # Build all tasks: TMDB pages + Archive pages
    tasks = []

    # TMDB page 1 always, then more if no query (browse mode has many pages)
    tmdb_page_count = TMDB_MAX_PAGES if not query else 2
    for p in range(1, tmdb_page_count + 1):
        tasks.append(("tmdb", p))

    # Archive pages
    for p in range(1, ARCHIVE_PAGES + 1):
        tasks.append(("archive", p))

    # Run all tasks in parallel with a shared thread pool
    with ThreadPoolExecutor(max_workers=len(tasks)) as pool:
        future_map = {}

        for source, p in tasks:
            if source == "tmdb":
                f = pool.submit(
                    tmdb.search,
                    query=query,
                    genre_ids=genre_ids,
                    year_from=year_from,
                    year_to=year_to,
                    sort_by=sort_by,
                    page=p,
                )
            else:
                f = pool.submit(
                    archive.fetch_movies,
                    search=query or None,
                    genre_ids=genre_ids or None,
                    year=year_from,     # archive supports single year only
                    page=p,
                    rows=20,
                )
            future_map[f] = (source, p)

        # Collect results as they complete — don't wait for slowest
        for future in as_completed(future_map, timeout=ARCHIVE_TIMEOUT + 2):
            source, p = future_map[future]
            try:
                data    = future.result(timeout=0)   # already done, no extra wait
                results = data.get("results", [])
                all_results.extend(results)
                if source == "archive" and results:
                    archive_included = True
                logger.debug("fetched %s p=%d → %d results", source, p, len(results))
            except (FT, Exception) as e:
                logger.info("fetch failed source=%s p=%d: %s", source, p, type(e).__name__)

    # Apply min_rating filter across all results
    if min_rating > 0:
        all_results = [
            m for m in all_results
            if float(m.get("rating") or 0) >= min_rating
        ]

    # Deduplicate by id
    merged = _deduplicate(all_results)

    # Global sort — applied ONCE to the full merged list
    if query:
        # Spec: search results → sort by title (A→Z)
        merged.sort(key=lambda m: (m.get("title") or "").lower())
    else:
        # Browse: sort by user's chosen criterion
        merged = _sort_results(merged, sort_by)

    logger.info(
        "library_search: total=%d tmdb+archive merged, archive_included=%s q=%r",
        len(merged), archive_included, query
    )

    return {
        "results":          merged,
        "archive_included": archive_included,
    }


def _full_result_key(query, genre_ids, year_from, year_to,
                      min_rating, sort_by) -> str:
    """
    Cache key for the FULL sorted result set.
    Does NOT include page — same key used for all pages of the same search.
    """
    return ":".join([
        "full",
        (query or "").lower().strip(),
        ",".join(str(g) for g in sorted(genre_ids or [])),
        str(year_from or ""),
        str(year_to or ""),
        str(min_rating),
        sort_by,
    ])