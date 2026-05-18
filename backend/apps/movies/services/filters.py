import hashlib
import logging
import math
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

from django.core.cache import cache

from .utils import deduplicate, sort_results
from ..adapters import tmdb, archive

logger = logging.getLogger(__name__)

ARCHIVE_WAIT      = 8.0           # seconds; Archive is slow but worth it for library
LIBRARY_CACHE_TTL = 60 * 20       # full sorted snapshots are reused while scrolling
PAGE_SIZE         = 40
TMDB_FETCH_PAGES  = 5             # 5 TMDB pages = up to ~100 normalized results
LIBRARY_ROWS      = 300           # one larger Archive request for the snapshot


def _library_cache_key(query, genre_ids, year_from, year_to, min_rating, sort_by) -> str:
    raw = f"{query}|{sorted(genre_ids or [])}|{year_from}|{year_to}|{min_rating}|{sort_by}"
    return "movies:library:v5:" + hashlib.md5(raw.encode()).hexdigest()


def library_search(
    query: str       = "",
    genre_ids: list  = None,
    year_from: int   = None,
    year_to: int     = None,
    min_rating: float = 0,
    sort_by: str     = "popularity",
    page: int        = 1,
) -> dict:
    page = max(1, page)
    query = (query or "").strip()
    effective_sort = sort_by or "popularity"
    key = _library_cache_key(
        query,
        genre_ids,
        year_from,
        year_to,
        min_rating,
        effective_sort,
    )
    snapshot = cache.get(key)

    if snapshot is None:
        snapshot = _fetch_library_snapshot(
            query=query,
            genre_ids=genre_ids,
            year_from=year_from,
            year_to=year_to,
            min_rating=min_rating,
            sort_by=effective_sort,
        )
        ttl = LIBRARY_CACHE_TTL if snapshot["results"] else 30
        cache.set(key, snapshot, ttl)

    all_results = snapshot["results"]
    total = len(all_results)
    total_pages = max(1, math.ceil(total / PAGE_SIZE))
    start = (page - 1) * PAGE_SIZE
    end = start + PAGE_SIZE

    result = {
        "results":          all_results[start:end],
        "page":             page,
        "totalPages":       total_pages,
        "has_more":         end < total,
        "total":            total,
        "totalResults":     total,
        "archive_included": snapshot.get("archive_included", False),
    }

    return result


def _fetch_library_snapshot(
    query: str = "",
    genre_ids: list = None,
    year_from: int = None,
    year_to: int = None,
    min_rating: float = 0,
    sort_by: str = "popularity",
) -> dict:
    tmdb_results = []
    archive_results = []
    archive_sort = "title" if query or sort_by == "name" else "downloads"
    if sort_by == "primary_release_date_desc":
        archive_sort = "year"
    elif sort_by == "primary_release_date_asc":
        archive_sort = "year_asc"

    default_browse = (
        not query
        and not genre_ids
        and year_from is None
        and year_to is None
        and min_rating == 0
        and sort_by == "popularity"
    )

    with ThreadPoolExecutor(max_workers=TMDB_FETCH_PAGES + 1) as pool:
        if default_browse:
            tmdb_futures = [
                pool.submit(tmdb.fetch_by_type, "trending", p, PAGE_SIZE)
                for p in range(1, TMDB_FETCH_PAGES + 1)
            ]
        else:
            tmdb_futures = [
                pool.submit(
                    tmdb.search,
                    query=query,
                    genre_ids=genre_ids,
                    year_from=year_from,
                    year_to=year_to,
                    sort_by=sort_by,
                    page=p,
                )
                for p in range(1, TMDB_FETCH_PAGES + 1)
            ]

        archive_f = pool.submit(
            archive.fetch_movies,
            search=query,
            genre_ids=genre_ids,
            year_from=year_from,
            year_to=year_to,
            sort_by=archive_sort,
            page=1,
            rows=LIBRARY_ROWS,
            timeout=ARCHIVE_WAIT,
        )

        for future in tmdb_futures:
            try:
                tmdb_results.extend(future.result().get("results", []))
            except Exception as exc:
                logger.warning("library TMDB page fetch failed: %s", exc)

        try:
            archive_results = archive_f.result(timeout=ARCHIVE_WAIT).get("results", [])
        except (FutureTimeout, Exception) as exc:
            logger.warning("library Archive fetch skipped: %s", exc)

    merged = deduplicate(
        _blend_sources(tmdb_results, archive_results)
        if default_browse
        else tmdb_results + archive_results
    )
    merged = _apply_library_filters(
        merged,
        genre_ids=genre_ids,
        year_from=year_from,
        year_to=year_to,
        min_rating=min_rating,
    )
    if not default_browse:
        sort_results(merged, sort_by)

    return {
        "results": merged,
        "archive_included": bool(archive_results),
    }


def _blend_sources(primary: list, secondary: list, interval: int = 3) -> list:
    """Keep the main source prominent while making sure Archive appears early."""
    if not secondary:
        return primary
    if not primary:
        return secondary

    blended = []
    secondary_index = 0
    for index, movie in enumerate(primary, start=1):
        blended.append(movie)
        if index % interval == 0 and secondary_index < len(secondary):
            blended.append(secondary[secondary_index])
            secondary_index += 1

    blended.extend(secondary[secondary_index:])
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

    return filtered


def _movie_year(movie: dict) -> int | None:
    try:
        return int(str(movie.get("year") or "")[:4])
    except ValueError:
        return None
