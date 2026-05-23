# import json
# import logging
# from celery import shared_task
# from .cache.movie_cache import (
#     acquire_lock, release_lock,
#     set_archive_detail, set_archive_detail_not_found,
#     set_archive_downloads, set_archive_runtime,
#     get_archive_search, set_archive_search,
# )
# from .client import safe_get
# from .services.utils import format_runtime

# logger   = logging.getLogger(__name__)
# BASE_URL = "https://archive.org/advancedsearch.php"

# @shared_task(bind=True, max_retries=3, default_retry_delay=15)
# def fetch_archive_detail_task(self, archive_id: str) -> None:
#     """
#     Fetches full metadata + downloads for one archive item.
#     Runs OUTSIDE request cycle, uses generous timeouts.
#     Writes to archive:detail:<id> and archive:runtime:<id>.
#     """
#     logger.info("fetch_archive_detail_task: %s", archive_id)
#     try:
#         print(f"Fetching archive detail for {archive_id}...")
#         from concurrent.futures import ThreadPoolExecutor

#         def get_metadata():
#             body = safe_get(f"https://archive.org/metadata/{archive_id}",
#                             timeout=15, retries=3, backoff=1.0, fallback=None)
#             return body.get("metadata") if body else None

#         def get_downloads() -> int:
#             body = safe_get(BASE_URL, params={
#                 "q": f"identifier:{archive_id}",
#                 "fl[]": "identifier,downloads", "rows": 1, "output": "json",
#             }, timeout=10, retries=2, fallback={})
#             docs = (body or {}).get("response", {}).get("docs", [])
#             return int(docs[0].get("downloads", 0)) if docs else 0

#         with ThreadPoolExecutor(max_workers=2) as pool:
#             meta_f = pool.submit(get_metadata)
#             down_f = pool.submit(get_downloads)
#             metadata  = meta_f.result(timeout=20)
#             downloads = down_f.result(timeout=15)

#         if not metadata:
#             set_archive_detail_not_found(archive_id)
#             logger.warning("fetch_archive_detail_task: no metadata for %s", archive_id)
#             return
        
#         print(json.dumps(metadata, indent=4))
#         print(json.dumps(downloads, indent=4))
    

#         from .adapters.archive import _normalize_detail
#         data = _normalize_detail(metadata, downloads)
#         set_archive_detail(archive_id, data)
#         set_archive_downloads(archive_id, downloads)
#         set_archive_runtime(archive_id, format_runtime(metadata.get("runtime")))
#         logger.info("fetch_archive_detail_task: done %s", archive_id)

#     except Exception as exc:
#         logger.error("fetch_archive_detail_task failed %s: %s", archive_id, exc)
#         raise self.retry(exc=exc)
#     finally:
#         release_lock(f"detail:{archive_id}")


# @shared_task(bind=True, max_retries=2, default_retry_delay=10)
# def fetch_archive_runtime_task(self, archive_id: str) -> None:
#     """Lightweight, only fetches runtime for the batch endpoint."""
#     try:
#         body = safe_get(f"https://archive.org/metadata/{archive_id}",
#                         timeout=10, retries=2, fallback=None)
#         if body:
#             set_archive_runtime(
#                 archive_id,
#                 format_runtime((body.get("metadata") or {}).get("runtime"))
#             )
#     except Exception as exc:
#         raise self.retry(exc=exc)
#     finally:
#         release_lock(f"runtime:{archive_id}")


# @shared_task(bind=True, max_retries=3, default_retry_delay=15)
# def search_archive_task(self, query: str, page: int = 1,
#                         genre_ids: list = None) -> None:
#     """
#     Background archive search — called when cache miss in SSE stream or library_search.
    
#     Design:
#     - Uses LONG timeout (Celery worker, user not waiting)
#     - Dedup lock prevents multiple workers fetching same page
#     - After caching page N, queues page N+1 automatically (up to 5 pages)
#     - This progressively builds the archive cache for a query+genre combo
    
#     Cache key: archive:search:<query>:g<genre_ids>:p<page>
#     This is read by library_search() and library_search_stream()
#     """
#     from .adapters.archive import (
#         BASE_URL, GENRE_SUBJECTS, is_safe_content, is_quality_movie,
#         _normalize_list, _build_search_query,
#     )
#     from .services.utils import build_response

#     genre_ids = genre_ids or []
#     genre_key = ",".join(str(g) for g in sorted(genre_ids))
#     query_str = query or ""

#     # Skip if query too short, no useful archive results
#     if query_str and len(query_str.strip()) < 2:
#         return

#     # Already cached, skip fetch, but queue next page to build pool
#     if get_archive_search(query_str, genre_key, page) is not None:
#         logger.debug("search_archive_task: already cached q=%r p=%d", query_str, page)
#         _queue_next_page(query_str, genre_ids, page)
#         return

#     # Dedup lock, only one worker fetches this exact page
#     lock_key = f"search:{query_str}:g{genre_key}:p{page}"
#     if not acquire_lock(lock_key, ttl=30):
#         logger.debug("search_archive_task: locked q=%r p=%d — skip", query_str, page)
#         return

#     try:
#         q_str = _build_search_query(query_str, genre_ids, None)
#         body  = safe_get(BASE_URL, params={
#             "q":      q_str,
#             "fl[]":   "identifier,title,description,year,subject,downloads",
#             "sort[]": "downloads desc",
#             "rows":   20,
#             "page":   page,
#             "output": "json",
#         }, timeout=20, retries=2, backoff=3.0, fallback=None)

#         if body is None:
#             logger.warning("search_archive_task: unreachable q=%r p=%d", query_str, page)
#             raise self.retry(countdown=30)

#         response    = body.get("response", {})
#         num_found   = response.get("numFound", 0)
#         docs        = [d for d in response.get("docs", [])
#                        if is_safe_content(d) and is_quality_movie(d)]
#         result      = build_response(response, [_normalize_list(d) for d in docs])
#         total_pages = max(1, -(-num_found // 20))

#         set_archive_search(query_str, result, genre_key, page)
#         logger.info("search_archive_task: q=%r g=%s p=%d → %d results (of %d pages)",
#                     query_str, genre_key, page, len(result["results"]), total_pages)

#         # Chain-queue next page, builds scroll cache proactively
#         if page < min(total_pages, 5):
#             _queue_next_page(query_str, genre_ids, page)

#     except Exception as exc:
#         if not isinstance(exc, self.MaxRetriesExceededError):
#             raise self.retry(exc=exc)
#     finally:
#         release_lock(lock_key)


# def _queue_next_page(query: str, genre_ids: list, current_page: int) -> None:
#     """Queue next archive page with 3s delay — gentle on archive.org."""
#     try:
#         search_archive_task.apply_async(
#             args=[query, current_page + 1, genre_ids],
#             countdown=3,
#         )
#     except Exception as e:
#         logger.warning("_queue_next_page failed: %s", e)
