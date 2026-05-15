import logging
from typing import Any

from django.core.cache import cache

logger = logging.getLogger(__name__)

# TTLs
TTL_ARCHIVE_DETAIL    = 60 * 60 * 24 * 7   # 7 days
TTL_ARCHIVE_DOWNLOADS = 60 * 60 * 24 * 3   # 3 days
TTL_ARCHIVE_RUNTIME   = 60 * 60 * 24 * 7   # 7 days
TTL_HOME_SECTION      = 60 * 20            # 20 min
TTL_GENRE_SECTION     = 60 * 20            # 20 min
TTL_TRENDING          = 60 * 30            # 30 min

# Sentinel — marks "we fetched and got nothing"
NOT_FOUND = "__NOT_FOUND__"


def _get(key: str) -> Any:
    try:
        return cache.get(key)
    except Exception as e:
        logger.warning("cache get failed [%s]: %s", key, e)
        return None


def _set(key: str, value: Any, ttl: int) -> None:
    try:
        cache.set(key, value, ttl)
    except Exception as e:
        logger.warning("cache set failed [%s]: %s", key, e)


def _delete(key: str) -> None:
    try:
        cache.delete(key)
    except Exception:
        pass


# ── Archive detail ─────────────────────────────────────────────────────────────

def get_archive_detail(archive_id: str) -> dict | None:
    """Returns cached detail, NOT_FOUND sentinel, or None (cache miss)."""
    return _get(f"archive:detail:{archive_id}")

def set_archive_detail(archive_id: str, data: dict) -> None:
    _set(f"archive:detail:{archive_id}", data, TTL_ARCHIVE_DETAIL)

def set_archive_detail_not_found(archive_id: str) -> None:
    """Cache the 404 so we don't keep hitting Archive for missing items."""
    _set(f"archive:detail:{archive_id}", NOT_FOUND, TTL_ARCHIVE_DETAIL)


# ── Archive downloads ─────────────────────────────────────────────────────────

def get_archive_downloads(archive_id: str) -> int | None:
    return _get(f"archive:downloads:{archive_id}")

def set_archive_downloads(archive_id: str, count: int) -> None:
    _set(f"archive:downloads:{archive_id}", count, TTL_ARCHIVE_DOWNLOADS)


# ── Archive runtime ───────────────────────────────────────────────────────────

def get_archive_runtime(archive_id: str) -> str | None:
    return _get(f"archive:runtime:{archive_id}")

def set_archive_runtime(archive_id: str, runtime: str) -> None:
    _set(f"archive:runtime:{archive_id}", runtime, TTL_ARCHIVE_RUNTIME)


# ── TMDB runtime (batch endpoint) ────────────────────────────────────────────

def get_tmdb_runtime(tmdb_id: int) -> str | None:
    return _get(f"tmdb:runtime:{tmdb_id}")

def set_tmdb_runtime(tmdb_id: int, runtime: str) -> None:
    _set(f"tmdb:runtime:{tmdb_id}", runtime, TTL_ARCHIVE_RUNTIME)


# ── Home sections ─────────────────────────────────────────────────────────────

def get_home_section(key: str) -> dict | None:
    return _get(f"home:{key}")

def set_home_section(key: str, data: dict, ttl: int = TTL_HOME_SECTION) -> None:
    _set(f"home:{key}", data, ttl)


# ── Request deduplication lock ────────────────────────────────────────────────

def acquire_fetch_lock(archive_id: str, ttl: int = 30) -> bool:
    """
    Returns True if this caller acquired the lock (should fetch).
    Returns False if another request is already fetching this id.
    Uses Redis SETNX semantics via cache.add().
    """
    try:
        return cache.add(f"lock:archive:{archive_id}", 1, ttl)
    except Exception:
        return True  # if Redis is down, allow the fetch

def release_fetch_lock(archive_id: str) -> None:
    _delete(f"lock:archive:{archive_id}")