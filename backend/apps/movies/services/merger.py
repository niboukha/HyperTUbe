# movies/services/merger.py
import random
from django.core.cache import cache
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

    if type_ != "genre":
        # Top rated: purely TMDB sorted by rating, no shuffle
        result = tmdb.fetch_by_type(type_, page)
        for r in result[:5]:  # Print first 5 for debugging
            print(f"{r['title']} ({r['backdrop_path']})")
    elif genre_ids:
        tmdb_movies    = tmdb.fetch_by_genre(genre_ids, page)
        archive_movies = archive.fetch_movies(genre_ids=genre_ids)

        result = _shuffle_merge(tmdb_movies, archive_movies)


    else:
        result = tmdb.fetch_trending(page)

    # cache.set(key, result, CACHE_TTL.get(type_, 60 * 15))
    return result


def _shuffle_merge(a: list, b: list) -> list:
    merged = a + b
    random.shuffle(merged)
    return merged

def _interleave(primary: list, secondary: list, tmdb_ratio=0.7) -> list:
    """Insert secondary items at random positions, keeping primary order."""

    result = list(primary)
    insert_count = max(1, int(len(secondary) * (1 - tmdb_ratio)))
    picks = random.sample(secondary, min(insert_count, len(secondary)))
    for item in picks:
        pos = random.randint(0, len(result))
        result.insert(pos, item)
    return result
