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


def get_home_section(type_: str, genre_id: int = None, page: int = 1) -> list:
    """
    Powers your frontend sections:
      /api/movies?type=trending&genre=28
      /api/movies?type=top
      /api/movies?genre=28
    """
    # key = _cache_key(type_, genre=genre_id, page=page)
    # cached = cache.get(key)
    # if cached:
    #     return cached

    if type_ == "trending":
        tmdb_movies  = tmdb.fetch_trending(page)
        archive_movies = archive.fetch_movies(genre_id=genre_id, sort_by="downloads")
        # Trending: mostly TMDB order, sprinkle archive
        result = _interleave(tmdb_movies, archive_movies, tmdb_ratio=0.75)

    elif type_ == "top":
        # Top rated: purely TMDB sorted by rating, no shuffle
        result = tmdb.fetch_top_rated(page)

    elif genre_id:
        tmdb_movies    = tmdb.fetch_by_genre(genre_id, page)
        archive_movies = archive.fetch_movies(genre_id=genre_id)
        # Genre rows: random mix
        result = _shuffle_merge(tmdb_movies, archive_movies)

    else:
        result = tmdb.fetch_trending(page)

    # cache.set(key, result, CACHE_TTL.get(type_, 60 * 15))
    return result


def _interleave(primary: list, secondary: list, tmdb_ratio=0.7) -> list:
    """Insert secondary items at random positions, keeping primary order."""
    result = list(primary)
    insert_count = max(1, int(len(secondary) * (1 - tmdb_ratio)))
    picks = random.sample(secondary, min(insert_count, len(secondary)))
    for item in picks:
        pos = random.randint(0, len(result))
        result.insert(pos, item)
    return result


def _shuffle_merge(a: list, b: list) -> list:
    merged = a + b
    random.shuffle(merged)
    return merged