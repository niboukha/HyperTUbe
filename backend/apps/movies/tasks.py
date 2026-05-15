# movies/tasks.py
import logging
from celery import shared_task

from .cache.movie_cache import (
    set_archive_detail, set_archive_detail_not_found,
    set_archive_downloads, set_archive_runtime,
    release_fetch_lock,
)
from .client import safe_get
from .services.utils import format_runtime

logger   = logging.getLogger(__name__)
BASE_URL = "https://archive.org/advancedsearch.php"


@shared_task(bind=True, max_retries=2, default_retry_delay=10)
def fetch_archive_detail_task(self, archive_id: str) -> None:
    """
    Fetch Archive.org metadata + downloads in background.
    Result stored in Redis — next user request gets it from cache.
    """
    logger.info("fetch_archive_detail_task: %s", archive_id)
    try:
        from concurrent.futures import ThreadPoolExecutor

        def get_metadata():
            body = safe_get(
                f"https://archive.org/metadata/{archive_id}",
                timeout=12, retries=2, backoff=1.0, fallback=None,
            )
            return body.get("metadata") if body else None

        def get_downloads() -> int:
            body = safe_get(BASE_URL, params={
                "q": f"identifier:{archive_id}",
                "fl[]": "identifier,downloads",
                "rows": 1, "output": "json",
            }, timeout=8, retries=2, fallback={})
            docs = (body or {}).get("response", {}).get("docs", [])
            return int(docs[0].get("downloads", 0)) if docs else 0

        with ThreadPoolExecutor(max_workers=2) as pool:
            meta_f  = pool.submit(get_metadata)
            down_f  = pool.submit(get_downloads)
            metadata  = meta_f.result(timeout=15)
            downloads = down_f.result(timeout=10)

        if not metadata:
            logger.warning("fetch_archive_detail_task: no metadata for %s", archive_id)
            set_archive_detail_not_found(archive_id)
            return

        # Normalize and cache
        from .adapters.archive import _normalize_detail, _parse_cast
        data = _normalize_detail(metadata, downloads)
        set_archive_detail(archive_id, data)
        set_archive_downloads(archive_id, downloads)

        # Also cache runtime while we have the data
        runtime = format_runtime(metadata.get("runtime"))
        set_archive_runtime(archive_id, runtime)

        logger.info("fetch_archive_detail_task: cached %s", archive_id)

    except Exception as exc:
        logger.error("fetch_archive_detail_task failed for %s: %s", archive_id, exc)
        raise self.retry(exc=exc)
    finally:
        release_fetch_lock(archive_id)


@shared_task(bind=True, max_retries=2, default_retry_delay=5)
def fetch_archive_runtime_task(self, archive_id: str) -> None:
    """Lightweight task — just fetches runtime for the batch endpoint."""
    try:
        body = safe_get(
            f"https://archive.org/metadata/{archive_id}",
            timeout=8, retries=2, fallback=None,
        )
        if body:
            runtime = format_runtime((body.get("metadata") or {}).get("runtime"))
            set_archive_runtime(archive_id, runtime)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task
def prefetch_archive_movies(genre_ids: list[int] = None,
                            search: str = None) -> None:
    """
    Background ingestion — discover archive movies and pre-warm their cache.
    Call this from management commands or after serving genre rows.
    """
    from .adapters.archive import fetch_movies
    from .cache.movie_cache import get_archive_detail, acquire_fetch_lock

    result = fetch_movies(genre_ids=genre_ids, search=search, rows=20)
    for movie in result.get("results", []):
        archive_id = movie.get("archive_id")
        if not archive_id:
            continue
        # Only queue if not already cached
        if get_archive_detail(archive_id) is None:
            if acquire_fetch_lock(archive_id):
                fetch_archive_detail_task.delay(archive_id)