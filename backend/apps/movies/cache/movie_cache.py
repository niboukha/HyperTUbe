from django.core.cache import cache


def get_cache_key(search, genre, page):
    return f"movies:s={search}:g={genre}:p={page}"


def get_cached_movies(search, genre, page):
    key = get_cache_key(search, genre, page)
    return cache.get(key)


def set_cached_movies(search, genre, page, data):
    key = get_cache_key(search, genre, page)
    cache.set(key, data, timeout=60 * 10)  # 10 min