import hashlib
import logging
import math
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout, as_completed

from django.core.cache import cache

from .utils import clear_all_cache, deduplicate, sort_results
from ..adapters import tmdb, archive, publicdomain

logger = logging.getLogger(__name__)

ARCHIVE_WAIT      = 8.0           # seconds; Archive is slow but worth it for library
LIBRARY_CACHE_TTL = 60 * 20       # full sorted snapshots are reused while scrolling
PARTIAL_CACHE_TTL = 30            # degraded snapshots are only a brief outage bridge
PAGE_SIZE         = 60
TMDB_FETCH_PAGES  = 5             # first TMDB batch
TMDB_MAX_PAGES    = 14            # hard cap so bad filters cannot run forever
TMDB_TARGET_ROWS  = 180           # enough for filtering + a few infinite-scroll pages
LIBRARY_ROWS      = 500           # one larger Archive request for the snapshot
PUBLIC_DOMAIN_ROWS = 300          # Public Domain Torrents catalog rows for library


# Create a unique short name for the upstream movie pool. Sort and filters are
# applied after this pool is cached so switching controls reorders the same set.
def _library_cache_key(query, language: str = "en", partial: bool = False) -> str:
    raw = f"{(query or '').strip().lower()}:{language}"
    suffix = ":partial" if partial else ""
    return "movies:library:v10:" + hashlib.md5(raw.encode()).hexdigest() + suffix


def library_search(
    query: str       = "",
    genre_ids: list  = None,
    year_from: int   = None,
    year_to: int     = None,
    min_rating: float = 0,
    sort_by: str     = "popularity",
    page: int        = 1,
    language: str    = "en",
) -> dict:
    # clear_all_cache()
    page            = max(1, page)
    query           = (query or "").strip()
    has_search      = bool(query)
    effective_sort  = sort_by or ("name" if has_search else "popularity")
    key             = _library_cache_key(query, language)
    partial_key     = _library_cache_key(query, language, partial=True)
    snapshot        = cache.get(key) or cache.get(partial_key)

    if snapshot is None:
        snapshot = _fetch_library_snapshot(
            query=query,
            language=language,
        )
        if snapshot.get("partial"):
            cache.set(partial_key, snapshot, PARTIAL_CACHE_TTL)
        else:
            ttl = LIBRARY_CACHE_TTL if snapshot["results"] else PARTIAL_CACHE_TTL
            cache.set(key, snapshot, ttl)
            cache.delete(partial_key)

    all_results = _apply_library_filters(
        list(snapshot["results"]),
        genre_ids=genre_ids,
        year_from=year_from,
        year_to=year_to,
        min_rating=min_rating,
    )
    sort_results(all_results, effective_sort)
    if _should_blend_sources(query, genre_ids, year_from, year_to, min_rating, effective_sort):
        all_results = _blend_sources(all_results)

    total       = len(all_results)
    total_pages = max(1, math.ceil(total / PAGE_SIZE))
    start       = (page - 1) * PAGE_SIZE
    end         = start + PAGE_SIZE
    page_results = _enrich_publicdomain_page(all_results[start:end])

    result = {
        "results":          page_results,
        "page":             page,
        "totalPages":       total_pages,
        "has_more":         end < total,
        "total":            total,
        "totalResults":     total,
        "archive_included": snapshot.get("archive_included", False),
        "archive_failed":   snapshot.get("archive_failed", False),
        "publicdomain_included": snapshot.get("publicdomain_included", False),
        "publicdomain_failed":   snapshot.get("publicdomain_failed", False),
    }

    return result


def _enrich_publicdomain_page(movies: list) -> list:
    publicdomain_indexes = [
        index for index, movie in enumerate(movies)
        if movie.get("source") == "publicdomain"
    ]
    if not publicdomain_indexes:
        return movies

    enriched = list(movies)
    with ThreadPoolExecutor(max_workers=min(6, len(publicdomain_indexes))) as pool:
        futures = {
            pool.submit(publicdomain.enrich_movie, movies[index]): index
            for index in publicdomain_indexes
        }
        for future in as_completed(futures):
            index = futures[future]
            try:
                enriched[index] = future.result()
            except Exception as exc:
                logger.warning("library Public Domain card enrichment skipped: %s", exc)
    return enriched


def _fetch_library_snapshot(
    query: str = "",
    language: str = "en",
) -> dict:
    tmdb_results = []
    archive_results = []
    publicdomain_results = []
    has_search = bool(query)
    archive_sort = "title" if has_search else "downloads"
    archive_failed = False
    publicdomain_failed = False

    with ThreadPoolExecutor(max_workers=TMDB_FETCH_PAGES + 2) as pool:
        archive_f = pool.submit(
            archive.fetch_movies,
            search=query,
            sort_by=archive_sort,
            page=1,
            rows=LIBRARY_ROWS,
            timeout=ARCHIVE_WAIT,
        )
        publicdomain_f = pool.submit(
            publicdomain.fetch_movies,
            search=query,
            sort_by=archive_sort,
            page=1,
            rows=PUBLIC_DOMAIN_ROWS,
            timeout=ARCHIVE_WAIT,
        )

        tmdb_results = _fetch_tmdb_library_rows(pool, query=query, language=language)

        try:
            archive_data = archive_f.result(timeout=ARCHIVE_WAIT)
            archive_failed = bool(archive_data.get("upstream_failed"))
            archive_results = archive_data.get("results", [])
        except (FutureTimeout, Exception) as exc:
            archive_failed = True
            logger.warning("library Archive fetch skipped: %s", exc)

        try:
            publicdomain_data = publicdomain_f.result(timeout=ARCHIVE_WAIT)
            publicdomain_failed = bool(publicdomain_data.get("upstream_failed"))
            publicdomain_results = publicdomain_data.get("results", [])
        except (FutureTimeout, Exception) as exc:
            publicdomain_failed = True
            logger.warning("library Public Domain Torrents fetch skipped: %s", exc)

    merged = deduplicate(tmdb_results + archive_results + publicdomain_results)

    return {
        "results": merged,
        "archive_included": bool(archive_results),
        "archive_failed": archive_failed,
        "publicdomain_included": bool(publicdomain_results),
        "publicdomain_failed": publicdomain_failed,
        "partial": archive_failed or publicdomain_failed,
    }


def _fetch_tmdb_library_rows(pool: ThreadPoolExecutor, query: str = "", language: str = "en") -> list:
    results = []
    seen = set()
    next_page = 1
    batch_size = TMDB_FETCH_PAGES

    while next_page <= TMDB_MAX_PAGES and len(results) < TMDB_TARGET_ROWS:
        last_page = min(next_page + batch_size - 1, TMDB_MAX_PAGES)
        futures = [
            pool.submit(_fetch_tmdb_library_page, query, page, language)
            for page in range(next_page, last_page + 1)
        ]
        batch_added = 0

        for future in futures:
            try:
                for movie in future.result().get("results", []):
                    movie_id = movie.get("id")
                    if movie_id in seen:
                        continue
                    seen.add(movie_id)
                    results.append(movie)
                    batch_added += 1
            except Exception as exc:
                logger.warning("library TMDB page fetch failed: %s", exc)

        if batch_added == 0:
            break
        next_page = last_page + 1

    return results[:TMDB_TARGET_ROWS]


def _fetch_tmdb_library_page(query: str, page: int, language: str = "en") -> dict:
    if query:
        return tmdb.search(query=query, sort_by="name", page=page, language=language)
    return tmdb.search(sort_by="popularity", page=page, language=language)


def _should_blend_sources(
    query: str,
    genre_ids: list = None,
    year_from: int = None,
    year_to: int = None,
    min_rating: float = 0,
    sort_by: str = "popularity",
) -> bool:
    return (
        not query
        and not genre_ids
        and year_from is None
        and year_to is None
        and min_rating == 0
        and sort_by == "popularity"
    )


def _blend_sources(movies: list) -> list:
    buckets = {}
    for movie in movies:
        buckets.setdefault(movie.get("source") or "unknown", []).append(movie)

    order = ["tmdb", "archive", "publicdomain"]
    blended = []
    seen = set()
    while True:
        added = False
        for source in order:
            bucket = buckets.get(source) or []
            if not bucket:
                continue
            movie = bucket.pop(0)
            movie_id = movie.get("id")
            if movie_id in seen:
                continue
            seen.add(movie_id)
            blended.append(movie)
            added = True
        if not added:
            break

    for bucket in buckets.values():
        for movie in bucket:
            movie_id = movie.get("id")
            if movie_id not in seen:
                seen.add(movie_id)
                blended.append(movie)

    return blended


def _apply_library_filters(
    movies: list,
    genre_ids: list = None,
    year_from: int = None,
    year_to: int = None,
    min_rating: float = 0,
) -> list:
    filtered = movies

    if genre_ids:
        selected = set(genre_ids)
        filtered = [
            m for m in filtered
            if selected.intersection(m.get("genre_ids") or [])
        ]

    if year_from is not None:
        filtered = [
            m for m in filtered
            if _movie_year(m) is not None and _movie_year(m) >= year_from
        ]

    if year_to is not None:
        filtered = [
            m for m in filtered
            if _movie_year(m) is not None and _movie_year(m) <= year_to
        ]

    if min_rating > 0:
        filtered = [
            m for m in filtered
            if float(m.get("rating") or 0) >= min_rating
        ]

    # if availability in ("free", "premium"):
    #     filtered = [
    #         m for m in filtered
    #         if m.get("availability") == availability
    #     ]

    return filtered


def _movie_year(movie: dict) -> int | None:
    try:
        return int(str(movie.get("year") or "")[:4])
    except ValueError:
        return None
