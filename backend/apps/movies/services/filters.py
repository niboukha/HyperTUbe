import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

from .utils import _shuffle_merge
from ..adapters import tmdb, archive

logger = logging.getLogger(__name__)


def library_search(query: str = "", genre_ids: list = None, year_from: int = None,
                   year_to: int = None, min_rating: float = 0,
                   sort_by: str = "popularity", page: int = 1,
                   page_size: int = 50) -> dict:
    with ThreadPoolExecutor(max_workers=2) as pool:
        tmdb_f    = pool.submit(tmdb.search, query=query, genre_ids=genre_ids,
                                year_from=year_from, year_to=year_to,
                                sort_by=sort_by, page=page)
        archive_f = pool.submit(archive.fetch_movies, search=query,
                                genre_ids=genre_ids, year=year_from,
                                page=page, rows=page_size)

        tmdb_data = tmdb_f.result()
        try:
            archive_data = archive_f.result(timeout=10)
        except (FutureTimeout, Exception) as e:
            logger.warning("archive timeout in library_search: %s", e)
            archive_data = {"results": [], "total_pages": 1}

    merged = _shuffle_merge(tmdb_data.get("results", []),
                            archive_data.get("results", []))

    if min_rating > 0:
        merged = [m for m in merged if float(m.get("rating") or 0) >= min_rating]

    sort_keys = {
        "vote_average":              lambda m: float(m.get("rating") or 0),
        "rating":                    lambda m: float(m.get("rating") or 0),
        "primary_release_date_desc": lambda m: m.get("year") or "0",
        "primary_release_date_asc":  lambda m: m.get("year") or "9999",
    }
    if sort_by in sort_keys:
        merged.sort(key=sort_keys[sort_by],
                    reverse="asc" not in sort_by)

    total_pages = max(tmdb_data.get("total_pages", 1),
                      archive_data.get("total_pages", 1), 1)
    return {"results": merged, "page": page,
            "totalPages": total_pages, "has_more": page < total_pages}
