import logging
from typing import Any
from django.core.cache import cache

logger = logging.getLogger(__name__)

#  Time To Live Strategy
TTL_ARCHIVE_DETAIL    = 60 * 60 * 24 * 7   # 7 days
TTL_ARCHIVE_DOWNLOADS = 60 * 60 * 24 * 3   # 3 days
TTL_ARCHIVE_RUNTIME   = 60 * 60 * 24 * 7   # 7 days
TTL_ARCHIVE_SEARCH    = 60 * 10            # 10 min
TTL_TMDB_RUNTIME      = 60 * 60 * 24 * 7   # 7 days
TTL_HOME_SECTION      = 60 * 20            # 20 min
TTL_SEARCH_RESULTS    = 60 * 10            # 10 min
TTL_FETCH_LOCK        = 30                 # seconds

NOT_FOUND = "__NOT_FOUND__"   # sentinel: we fetched, got nothing, don't retry


#  Internal helpers ---------------------------------------------------------------
def _get(key: str) -> Any:
    try:
        return cache.get(key)
    except Exception as e:
        logger.warning("cache.get failed [%s]: %s", key, e)
        return None

def _set(key: str, value: Any, ttl: int) -> None:
    try:
        cache.set(key, value, ttl)
    except Exception as e:
        logger.warning("cache.set failed [%s]: %s", key, e)

def _delete(key: str) -> None:
    try:
        cache.delete(key)
    except Exception:
        pass


# Archive detail
# Key: archive:detail:<identifier>
# Written by: fetch_archive_detail_task (Celery)
# Read by:    archive.fetch_detail()

def get_archive_detail(archive_id: str) -> Any:
    return _get(f"archive:detail:{archive_id}")

def set_archive_detail(archive_id: str, data: dict) -> None:
    _set(f"archive:detail:{archive_id}", data, TTL_ARCHIVE_DETAIL)

def set_archive_detail_not_found(archive_id: str) -> None:
    """Cache a NOT_FOUND sentinel — prevents repeated fetches for missing items."""
    _set(f"archive:detail:{archive_id}", NOT_FOUND, TTL_ARCHIVE_DETAIL)


#  Archive downloads ----------------------------------------------------
# Key: archive:downloads:<identifier>
# Stored separately so we can update download counts without re-fetching metadata

def get_archive_downloads(archive_id: str) -> int | None:
    return _get(f"archive:downloads:{archive_id}")

def set_archive_downloads(archive_id: str, count: int) -> None:
    _set(f"archive:downloads:{archive_id}", count, TTL_ARCHIVE_DOWNLOADS)


#  Archive runtime --------------------------------------------------
# Key: archive:runtime:<identifier>
# Written by: fetch_archive_detail_task AND fetch_archive_runtime_task
# Read by:    archive.fetch_runtime() and views.movies_runtime_batch

def get_archive_runtime(archive_id: str) -> str | None:
    return _get(f"archive:runtime:{archive_id}")

def set_archive_runtime(archive_id: str, runtime: str) -> None:
    _set(f"archive:runtime:{archive_id}", runtime, TTL_ARCHIVE_RUNTIME)


#  TMDB runtime --------------------------------------------------------
# Key: tmdb:runtime:<tmdb_id>
# Written by: tmdb.fetch_runtime()
# Read by:    views.movies_runtime_batch

def get_tmdb_runtime(tmdb_id: int) -> str | None:
    return _get(f"tmdb:runtime:{tmdb_id}")

def set_tmdb_runtime(tmdb_id: int, runtime: str) -> None:
    _set(f"tmdb:runtime:{tmdb_id}", runtime, TTL_TMDB_RUNTIME)


#  Archive search -------------------------------------------------------
# Key: archive:search:<query>:g<genre_ids>:p<page>
#
# IMPORTANT: query and genre_key together form a unique search identity.
# "batman" with genre=27 is different from "batman" with no genre.
# page is included because we fetch and cache each page separately for scroll.
#
# Written by: search_archive_task (Celery)
# Read by:    library_search(), library_search_stream(), movie_search()

def _archive_search_key(query: str, genre_key: str, page: int) -> str:
    return f"archive:search:{query.lower().strip()}:g{genre_key}:p{page}"

def get_archive_search(query: str, genre_key: str = "", page: int = 1) -> dict | None:
    return _get(_archive_search_key(query, genre_key, page))

def set_archive_search(query: str, data: dict,
                       genre_key: str = "", page: int = 1) -> None:
    _set(_archive_search_key(query, genre_key, page), data, TTL_ARCHIVE_SEARCH)


#  Library search (merged results) -------------------------------------------
# Key: search:library:<full_filter_key>
#
# Stores the final merged TMDB+Archive result for a specific filter combination.
# Short TTL when archive is missing (so next request retries archive).
# Full TTL when both sources are present.
#
# Written by: library_search()
# Read by:    library_search()

def _search_key(cache_key: str, source: str) -> str:
    return f"search:{source}:{cache_key}"

def get_search_results(cache_key: str, source: str = "all") -> dict | None:
    return _get(_search_key(cache_key, source))

def set_search_results(cache_key: str, data: dict,
                       source: str = "all", ttl: int = None) -> None:
    _set(_search_key(cache_key, source), data, ttl or TTL_SEARCH_RESULTS)


#  Home sections --------------------------------------------------------------
# Key: home:<type>:g<genre_ids>:p<page>
# Written by: merger.get_home_section()
# Read by:    merger.get_home_section()

def get_home_section_cache(key: str) -> dict | None:
    return _get(f"home:{key}")

def set_home_section_cache(key: str, data: dict, ttl: int = TTL_HOME_SECTION) -> None:
    _set(f"home:{key}", data, ttl)


#  Deduplication locks ------------------------------------------------------
# Key: lock:<arbitrary_key>
#
# Uses Redis SETNX (cache.add), atomic, only one caller wins.
# Prevents multiple Celery workers from fetching the same archive page.
# Auto-expires after TTL_FETCH_LOCK seconds in case worker crashes.
#
# Written/read by: tasks.py, archive.py

def acquire_lock(key: str, ttl: int = TTL_FETCH_LOCK) -> bool:
    """Returns True if this caller got the lock. False if already locked."""
    try:
        return cache.add(f"lock:{key}", 1, ttl)
    except Exception:
        return True   # Redis down -> allow fetch (better than deadlock)

def release_lock(key: str) -> None:
    _delete(f"lock:{key}")











# import logging
# from typing import Any

# from django.core.cache import cache

# logger = logging.getLogger(__name__)

# # TTLs
# TTL_ARCHIVE_DETAIL    = 60 * 60 * 24 * 7   # 7 days
# TTL_ARCHIVE_DOWNLOADS = 60 * 60 * 24 * 3   # 3 days
# TTL_ARCHIVE_RUNTIME   = 60 * 60 * 24 * 7   # 7 days
# TTL_HOME_SECTION      = 60 * 20            # 20 min
# TTL_GENRE_SECTION     = 60 * 20            # 20 min
# TTL_TRENDING          = 60 * 30            # 30 min

# # Sentinel — marks "we fetched and got nothing"
# NOT_FOUND = "__NOT_FOUND__"

# def _get(key: str) -> Any:
#     try:
#         return cache.get(key)
#     except Exception as e:
#         logger.warning("cache get failed [%s]: %s", key, e)
#         return None


# def _set(key: str, value: Any, ttl: int) -> None:
#     try:
#         cache.set(key, value, ttl)
#     except Exception as e:
#         logger.warning("cache set failed [%s]: %s", key, e)


# def _delete(key: str) -> None:
#     try:
#         cache.delete(key)
#     except Exception:
#         pass


# # Archive detail
# def get_archive_detail(archive_id: str) -> dict | None:
#     """Returns cached detail, NOT_FOUND sentinel, or None (cache miss)."""
#     return _get(f"archive:detail:{archive_id}")

# def set_archive_detail(archive_id: str, data: dict) -> None:
#     _set(f"archive:detail:{archive_id}", data, TTL_ARCHIVE_DETAIL)

# def set_archive_detail_not_found(archive_id: str) -> None:
#     """Cache the 404 so we don't keep hitting Archive for missing items."""
#     _set(f"archive:detail:{archive_id}", NOT_FOUND, TTL_ARCHIVE_DETAIL)


# # Archive downloads
# def get_archive_downloads(archive_id: str) -> int | None:
#     return _get(f"archive:downloads:{archive_id}")

# def set_archive_downloads(archive_id: str, count: int) -> None:
#     _set(f"archive:downloads:{archive_id}", count, TTL_ARCHIVE_DOWNLOADS)


# # Archive runtime
# def get_archive_runtime(archive_id: str) -> str | None:
#     return _get(f"archive:runtime:{archive_id}")

# def set_archive_runtime(archive_id: str, runtime: str) -> None:
#     _set(f"archive:runtime:{archive_id}", runtime, TTL_ARCHIVE_RUNTIME)


# # TMDB runtime (batch endpoint)
# def get_tmdb_runtime(tmdb_id: int) -> str | None:
#     return _get(f"tmdb:runtime:{tmdb_id}")

# def set_tmdb_runtime(tmdb_id: int, runtime: str) -> None:
#     _set(f"tmdb:runtime:{tmdb_id}", runtime, TTL_ARCHIVE_RUNTIME)


# # Home sections
# def get_home_section(key: str) -> dict | None:
#     return _get(f"home:{key}")

# def set_home_section(key: str, data: dict, ttl: int = TTL_HOME_SECTION) -> None:
#     _set(f"home:{key}", data, ttl)


# # Request deduplication lock
# def acquire_fetch_lock(archive_id: str, ttl: int = 30) -> bool:
#     """
#     Returns True if this caller acquired the lock (should fetch).
#     Returns False if another request is already fetching this id.
#     Uses Redis SETNX semantics via cache.add().
#     """
#     try:
#         return cache.add(f"lock:archive:{archive_id}", 1, ttl)
#     except Exception:
#         return True  # if Redis is down, allow the fetch

# def release_fetch_lock(archive_id: str) -> None:
#     _delete(f"lock:archive:{archive_id}")


# # Search results
# TTL_SEARCH_RESULTS  = 60 * 10   # 10 min
# TTL_ARCHIVE_SEARCH  = 60 * 10   # 10 min

# def _search_key(cache_key: str, source: str) -> str:
#     """Single key builder — used by both get and set."""
#     return f"search:{source}:{cache_key}"

# def get_search_results(cache_key: str, source: str = "all") -> dict | None:
#     return _get(_search_key(cache_key, source))

# def set_search_results(cache_key: str, data: dict,
#                        source: str = "all", ttl: int = None) -> None:
#     _set(_search_key(cache_key, source), data, ttl or TTL_SEARCH_RESULTS)

# # Archive search cache (used by fetch_movies + library_search)

# def _archive_search_key(query: str, genre_key: str, page: int) -> str:
#     return f"archive:search:{query.lower().strip()}:g{genre_key}:p{page}"

# def get_archive_search(query: str, genre_key: str = "", page: int = 1) -> dict | None:
#     return _get(_archive_search_key(query, genre_key, page))

# def set_archive_search(query: str, data: dict,
#                        genre_key: str = "", page: int = 1) -> None:
#     _set(_archive_search_key(query, genre_key, page), data, TTL_ARCHIVE_SEARCH)


    