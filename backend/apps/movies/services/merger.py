# movies/services/merger.py
import random
from django.core.cache import cache

from .utils import _shuffle_merge
from ..adapters import tmdb, archive

CACHE_TTL = {
    "trending": 60 * 30,    # 30 min
    "top":      60 * 60,    # 1 hour
    "genre":    60 * 20,    # 20 min
}

def _cache_key(type_, **kwargs):
    parts = [type_] + [f"{k}={v}" for k, v in sorted(kwargs.items()) if v]
    return "movies:" + ":".join(parts)


def get_home_section(type_: str, genre_ids: list = None, page: int = 1) -> list:
    """
    Powers your frontend sections:
      /movies?type=trending&genre=28
      /movies?type=top
      /movies?genre=28
    """
    # key = _cache_key(type_, genre=genre_ids, page=page)
    # cached = cache.get(key)
    # if cached:
    #     return cached

    print(f"Fetching {type_} movies from TMDB (genre_ids={genre_ids}, page={page})")

    if type_ != "genre":
        response    = tmdb.fetch_by_type(type_, page)

        result      = response["results"]
        total_pages = response["total_pages"]

    elif genre_ids:
        tmdb_response       = tmdb.fetch_by_genre(genre_ids, page)
        archive_response    = archive.fetch_movies( genre_ids=genre_ids, page=page )

        tmdb_movies     = tmdb_response["results"]
        archive_movies  = archive_response["results"]

        result      = _shuffle_merge(tmdb_movies, archive_movies)
        total_pages = max(
            tmdb_response["total_pages"],
            archive_response["total_pages"],
        )
    
    else:
        response    = tmdb.fetch_by_type("trending", page)
        result      = response["results"]
        total_pages = response["total_pages"]

    print(
        f"Fetched {len(result)} movies for "
        f"type={type_} (genre_ids={genre_ids})"
    )

    # cache.set(key, result, CACHE_TTL.get(type_, 60 * 15))

    return {
        "results"       : result,
        "page"          : page,
        "total_pages"   : total_pages,
    }
