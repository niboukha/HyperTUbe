# movies/services/filters.py
from concurrent.futures import ThreadPoolExecutor

from .utils import _shuffle_merge
from ..adapters import tmdb, archive

def library_search(
    query: str      = "",
    genre_ids: list = None,
    year_from: int  = None,
    year_to: int    = None,
    min_rating: float = 0,
    sort_by: str    = "popularity",
    page: int       = 1,
    page_size: int  = 50,
) -> dict:
    with ThreadPoolExecutor(max_workers=2) as pool:
        tmdb_future    = pool.submit(tmdb.search,
                             query=query, genre_ids=genre_ids,
                             year_from=year_from, year_to=year_to,
                             sort_by=sort_by, page=page)
        archive_future = pool.submit(archive.fetch_movies,
                             search=query, genre_ids=genre_ids,
                             year=year_from,   # archive only supports single year
                             page=page, rows=page_size)
        
        tmdb_data    = tmdb_future.result()     # now returns (results, total_pages)
        archive_data = archive_future.result()

    tmdb_results = tmdb_data.get("results", [])
    tmdb_total_pages = tmdb_data.get("total_pages", 1)

    archive_results = archive_data.get("results", [])
    archive_total_pages = archive_data.get("total_pages", 1)

    merged = _shuffle_merge(tmdb_results, archive_results)

    # Apply min_rating filter (archive has no rating so it always passes)
    if min_rating > 0:
        merged = [m for m in merged if float(m.get("rating")) >= min_rating]

    # Sort
    if sort_by in ("vote_average", "rating"):
        merged.sort(key=lambda m: float(m.get("rating") or 0), reverse=True)
    elif sort_by == "primary_release_date_desc":
        merged.sort(key=lambda m: m.get("year") or "0", reverse=True)
    elif sort_by == "primary_release_date_asc":
        merged.sort(key=lambda m: m.get("year") or "9999")

    total_pages = max(tmdb_total_pages, archive_total_pages, 1)

    return {
        "results":    merged,
        "page":       page,
        "totalPages": total_pages,
        "has_more":   page < total_pages,
    }
