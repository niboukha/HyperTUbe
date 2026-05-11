# movies/services/filters.py
import asyncio
from concurrent.futures import ThreadPoolExecutor
from ..adapters import tmdb, archive

executor = ThreadPoolExecutor(max_workers=4)

def library_search(
    query: str = "",
    genre_id: int = None,
    year: str = None,
    sort_by: str = "popularity",   # popularity | rating | year | title
    source: str = "all",           # all | tmdb | archive
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """
    Fetches from both APIs in parallel, merges, sorts, paginates.
    Powers your infinite-scroll library page.
    """
    tmdb_results    = []
    archive_results = []

    # Parallel fetch using threads (Django sync-friendly)
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {}
        if source in ("all", "tmdb"):
            futures["tmdb"] = pool.submit(
                tmdb.search,
                query=query, genre_id=genre_id,
                year=year, sort_by=sort_by, page=page
            )
        if source in ("all", "archive"):
            futures["archive"] = pool.submit(
                archive.fetch_movies,
                search=query, genre_id=genre_id,
                year=year, sort_by=_map_sort(sort_by),
                page=page, rows=page_size
            )

        if "tmdb"    in futures: tmdb_results    = futures["tmdb"].result()
        if "archive" in futures: archive_results = futures["archive"].result()

    merged = _merge_and_sort(tmdb_results, archive_results, sort_by)

    # Pagination on merged result
    start  = (page - 1) * page_size   # if doing client-side page logic
    return {
        "results":   merged,           # already page-sized from APIs
        "page":      page,
        "has_more":  len(merged) >= page_size,
    }


def _map_sort(sort_by: str) -> str:
    return {"rating": "year", "year": "year",
            "title": "title"}.get(sort_by, "downloads")


def _merge_and_sort(tmdb_r, archive_r, sort_by):
    merged = tmdb_r + archive_r
    if sort_by == "rating":
        merged.sort(key=lambda m: m["rating"], reverse=True)
    elif sort_by == "year":
        merged.sort(key=lambda m: m["year"] or "0", reverse=True)
    elif sort_by == "title":
        merged.sort(key=lambda m: m["title"].lower())
    # "popularity" → keep API ordering (already sorted by popularity)
    return merged