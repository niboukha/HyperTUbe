from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from django.core.cache import cache

from .utils import _shuffle_merge
from ..adapters import tmdb, archive

# How long each section stays cached
CACHE_TTL = {
    "trending": 60 * 30,   # 30 min
    "top":      60 * 60,   # 1 hr
    "genre":    60 * 20,   # 20 min
}

HOME_TOTAL = 20
ARCHIVE_LIMIT = 10         # 10 TMDB + 10 Archive per home section page
ARCHIVE_WAIT = 6.0      # seconds we're willing to wait for Archive on home


def _cache_key(type_: str, genre_ids=None, page=1) -> str:
    genre_str = "-".join(str(g) for g in sorted(genre_ids or []))
    return f"movies:home:v2:{type_}:g{genre_str}:p{page}"


def get_home_section(
    type_: str,
    genre_ids: list = None,
    page: int = 1,
) -> dict:
    key    = _cache_key(type_, genre_ids, page)
    cached = cache.get(key)
    if cached:
        return cached

    # genre section: TMDB + Archive in parallel
    if type_ == "genre" and genre_ids:
        with ThreadPoolExecutor(max_workers=2) as pool:
            tmdb_f    = pool.submit(tmdb.fetch_by_genre, genre_ids, page, HOME_TOTAL)
            archive_f = pool.submit(
                archive.fetch_movies,
                genre_ids=genre_ids,
                page=page,
                rows=ARCHIVE_LIMIT,
                timeout=ARCHIVE_WAIT,
            )

            tmdb_data = tmdb_f.result()          # TMDB is fast, always wait

            try:
                archive_data = archive_f.result(timeout=ARCHIVE_WAIT)
            except (FutureTimeout, Exception):
                archive_data = {"results": [], "total_pages": 1}

        # Trim TMDB to HOME_TOTAL so home cards stay balanced
        archive_results = archive_data.get("results", [])[:ARCHIVE_LIMIT]

        remaining       = HOME_TOTAL - len(archive_results)
        tmdb_results    = tmdb_data.get("results", [])[:remaining]

        merged      = _shuffle_merge(tmdb_results, archive_results)
        total_pages = max(
            tmdb_data.get("total_pages", 1),
            archive_data.get("total_pages", 1),
        )

    # trending / top_rated / now_playing — TMDB only
    else:
        tmdb_type = type_ if type_ != "genre" else "trending"
        data      = tmdb.fetch_by_type(tmdb_type, page, HOME_TOTAL)

        merged      = data.get("results", [])[:20]
        total_pages = data.get("total_pages", 1)

    result = {
        "results":     merged,
        "page":        page,
        "total_pages": total_pages,
    }

    ttl = CACHE_TTL.get(type_, 60 * 15)
    if len(merged) < HOME_TOTAL:
        ttl = 60
    cache.set(key, result, ttl)
    return result
