import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

from .utils import _shuffle_merge
from ..adapters import tmdb, archive

logger = logging.getLogger(__name__)

CACHE_TTL = {"trending": 1800, "top": 3600, "genre": 1200}

def _cache_get(key):
    try:
        from django.core.cache import cache
        return cache.get(key)
    except Exception:
        return None

def _cache_set(key, value, ttl):
    try:
        from django.core.cache import cache
        cache.set(key, value, ttl)
    except Exception:
        pass

def _cache_key(type_: str, genre_ids: list, page: int) -> str:
    return f"movies:{type_}:g{','.join(str(g) for g in sorted(genre_ids or []))}:p{page}"


def get_home_section(type_: str, genre_ids: list = None, page: int = 1) -> dict:
    key    = _cache_key(type_, genre_ids, page)
    cached = _cache_get(key)
    if cached:
        return cached

    if type_ != "genre":
        resp   = tmdb.fetch_by_type(type_, page)
        result = {"results": resp["results"], "page": page,
                  "total_pages": resp["total_pages"]}
        _cache_set(key, result, CACHE_TTL.get(type_, 900))
        return result

    if genre_ids:
        with ThreadPoolExecutor(max_workers=2) as pool:
            tmdb_f    = pool.submit(tmdb.fetch_by_genre, genre_ids, page)
            archive_f = pool.submit(archive.fetch_movies, genre_ids=genre_ids, page=page)

            tmdb_resp = tmdb_f.result()
            try:
                archive_resp   = archive_f.result(timeout=12)
                archive_movies = archive_resp.get("results", [])
                archive_pages  = archive_resp.get("total_pages", 1)
            except (FutureTimeout, Exception) as e:
                logger.warning("archive timeout in get_home_section: %s", e)
                archive_movies, archive_pages = [], 1

        result = {
            "results":     _shuffle_merge(tmdb_resp["results"], archive_movies),
            "page":        page,
            "total_pages": max(tmdb_resp["total_pages"], archive_pages, 1),
        }
        ttl = CACHE_TTL["genre"] if archive_movies else 120
        _cache_set(key, result, ttl)
        return result

    resp   = tmdb.fetch_by_type("trending", page)
    result = {"results": resp["results"], "page": page,
              "total_pages": resp["total_pages"]}
    _cache_set(key, result, CACHE_TTL["trending"])
    return result