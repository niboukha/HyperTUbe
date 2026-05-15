import random
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

from .utils import _shuffle_merge
from ..adapters import tmdb, archive

CACHE_TTL = {
    "trending": 60 * 30,
    "top":      60 * 60,
    "genre":    60 * 20,
}

ARCHIVE_FAST_TIMEOUT = 4   # seconds — if archive responds, great; if not, skip it

def _cache_key(type_: str, genre_ids: list, page: int) -> str:
    genre_str = ",".join(str(g) for g in sorted(genre_ids or []))
    return f"movies:{type_}:g{genre_str}:p{page}"

def _cache_get(key: str):
    try:
        from django.core.cache import cache
        return cache.get(key)
    except Exception:
        return None

def _cache_set(key: str, value, ttl: int):
    try:
        from django.core.cache import cache
        cache.set(key, value, ttl)
    except Exception:
        pass


def get_home_section(type_: str, genre_ids: list = None, page: int = 1) -> dict:
    key    = _cache_key(type_, genre_ids, page)
    cached = _cache_get(key)
    if cached:
        return cached

    if type_ != "genre":
        resp   = tmdb.fetch_by_type(type_, page)
        result = {
            "results":     resp["results"],
            "page":        page,
            "total_pages": resp["total_pages"],
        }
        _cache_set(key, result, CACHE_TTL.get(type_, 60 * 15))
        return result

    if genre_ids:
        with ThreadPoolExecutor(max_workers=2) as pool:
            tmdb_f    = pool.submit(tmdb.fetch_by_genre, genre_ids, page)
            archive_f = pool.submit(archive.fetch_movies,
                                    genre_ids=genre_ids, page=page)

            tmdb_resp       = tmdb_f.result()
            archive_resp    = archive_f.result()

        result = {
            "results":     _shuffle_merge(tmdb_resp["results"], archive_resp["results"]),
            "page":        page,
            "total_pages": max(tmdb_resp["total_pages"], archive_resp["total_pages"], 1),
        }
        # Only cache if we got archive data too; otherwise use a short TTL
        # so the next request has a chance to get archive results
        ttl = CACHE_TTL["genre"] if archive_resp["results"] else 60 * 2
        _cache_set(key, result, ttl)
        return result

    resp   = tmdb.fetch_by_type("trending", page)
    result = {
        "results":     resp["results"],
        "page":        page,
        "total_pages": resp["total_pages"],
    }
    _cache_set(key, result, CACHE_TTL["trending"])
    return result