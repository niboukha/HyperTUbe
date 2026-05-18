import logging
from typing import Any
from django.core.cache import cache

logger = logging.getLogger(__name__)

# TTLs
TTL_LIBRARY      = 60 * 10            # 10 min — library search results
TTL_HOME         = 60 * 20            # 20 min — home sections
TTL_DETAIL       = 60 * 60 * 24 * 7  # 7 days — movie detail pages
TTL_RUNTIME      = 60 * 60 * 24 * 7  # 7 days — runtime never changes
TTL_LOCK         = 30                 # seconds — fetch dedup lock

NOT_FOUND = "__NOT_FOUND__"


def _get(key: str) -> Any:
    try:
        return cache.get(key)
    except Exception as e:
        logger.warning("cache.get [%s]: %s", key, e)
        return None


def _set(key: str, value: Any, ttl: int) -> None:
    try:
        cache.set(key, value, ttl)
    except Exception as e:
        logger.warning("cache.set [%s]: %s", key, e)


def _delete(key: str) -> None:
    try:
        cache.delete(key)
    except Exception:
        pass


# Library search — full sorted list 
# Key includes all filter params EXCEPT page.
# All scroll pages share the same cached list and just slice it.
def library_key(query, genre_ids, year_from, year_to, min_rating, sort_by) -> str:
    return "library:" + ":".join([
        (query or "").lower().strip(),
        ",".join(str(g) for g in sorted(genre_ids or [])),
        str(year_from or ""),
        str(year_to or ""),
        str(min_rating),
        sort_by,
    ])

def get_library(key: str) -> dict | None:
    return _get(key)

def set_library(key: str, data: dict, ttl: int = TTL_LIBRARY) -> None:
    _set(key, data, ttl)


# Home sections 
def home_key(type_: str, genre_ids: list, page: int) -> str:
    return f"home:{type_}:g{','.join(str(g) for g in sorted(genre_ids or []))}:p{page}"

def get_home(key: str) -> dict | None:
    return _get(key)

def set_home(key: str, data: dict, ttl: int = TTL_HOME) -> None:
    _set(key, data, ttl)


# Movie detail
def get_detail(movie_id: str) -> dict | None:
    return _get(f"detail:{movie_id}")

def set_detail(movie_id: str, data: dict) -> None:
    _set(f"detail:{movie_id}", data, TTL_DETAIL)

def set_detail_not_found(movie_id: str) -> None:
    _set(f"detail:{movie_id}", NOT_FOUND, TTL_DETAIL)


# Runtime
def get_runtime(movie_id: str) -> str | None:
    return _get(f"runtime:{movie_id}")

def set_runtime(movie_id: str, runtime: str) -> None:
    _set(f"runtime:{movie_id}", runtime, TTL_RUNTIME)


# Dedup locks
def acquire_lock(key: str) -> bool:
    try:
        return cache.add(f"lock:{key}", 1, TTL_LOCK)
    except Exception:
        return True

def release_lock(key: str) -> None:
    _delete(f"lock:{key}")