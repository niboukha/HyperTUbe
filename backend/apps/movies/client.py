import logging
import time
import requests

from typing import Any

logger = logging.getLogger(__name__)


def safe_get(
    url:      str,
    params:   dict  = None,
    headers:  dict  = None,
    timeout:  int   = 8,       # caller overrides for background tasks
    retries:  int   = 2,       # max 2 in request cycle
    backoff:  float = 0.5,
    fallback: Any   = None,
) -> Any:
    """
    Single HTTP wrapper. Never raises — always returns JSON or fallback.
    
    Design decisions:
    - Short timeout/retries for request-cycle calls (user is waiting)
    - Caller sets timeout=20, retries=3 for Celery background tasks
    - Logs every failure so you can see archive.org health in logs
    """
    last_exc = None
    for attempt in range(retries):
        try:
            r = requests.get(url, params=params, headers=headers, timeout=timeout)
            if r.status_code == 200:
                return r.json()
            logger.warning("safe_get HTTP %s: %s (attempt %d/%d)",
                           r.status_code, url, attempt + 1, retries)
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            last_exc = e
            logger.warning("safe_get timeout/conn: %s (attempt %d/%d) — %s",
                           url, attempt + 1, retries, type(e).__name__)
        except Exception as e:
            logger.error("safe_get unexpected error %s: %s", url, e)
            return fallback

        if attempt < retries - 1:
            time.sleep(backoff * (attempt + 1))

    if last_exc:
        logger.error("safe_get exhausted retries: %s", url)
    return fallback




# import logging
# import time
# from typing import Any

# import requests

# logger = logging.getLogger(__name__)

# def safe_get(url: str, params: dict = None, headers: dict = None,
#              timeout: int = 20, retries: int = 10, backoff: float = 0.5,
#              fallback: Any = None) -> Any:
#     last_exc = None
#     for attempt in range(retries):
#         try:
#             r = requests.get(url, params=params, headers=headers, timeout=timeout)
#             if r.status_code == 200:
#                 return r.json()
#             logger.warning("safe_get HTTP %s: %s (attempt %d)",
#                            r.status_code, url, attempt + 1)
#         except (requests.exceptions.Timeout,
#                 requests.exceptions.ConnectionError) as e:
#             last_exc = e
#             logger.warning("safe_get network error: %s — %s (attempt %d)",
#                            url, e, attempt + 1)
#         except Exception as e:
#             logger.error("safe_get unexpected: %s — %s", url, e)
#             return fallback
#         if attempt < retries - 1:
#             time.sleep(backoff * (attempt + 1))
#     if last_exc:
#         logger.error("safe_get exhausted retries: %s — %s", url, last_exc)
#     return fallback

# # Safe HTTP wrapper --------------------------------------------------------------------

# def safe_get(
#     url:      str,
#     params:   dict        = None,
#     headers:  dict        = None,
#     timeout:  int         = 8,
#     retries:  int         = 2,
#     backoff:  float       = 0.5,
#     fallback: Any         = None,
# ) -> Any:
#     """
#     GET with retry + timeout. Returns parsed JSON or fallback on any failure.
#     Never raises — all exceptions are caught and logged.
#     """
#     last_exc = None

#     for attempt in range(retries):
#         try:
#             r = requests.get(url, params=params, headers=headers, timeout=timeout)
#             if r.status_code == 200:
#                 return r.json()
#             logger.warning("safe_get HTTP %s: %s (attempt %d)", r.status_code, url, attempt + 1)
#         except (requests.exceptions.Timeout,
#                 requests.exceptions.ConnectionError) as e:
#             last_exc = e
#             logger.warning("safe_get network error: %s — %s (attempt %d)", url, e, attempt + 1)
#         except Exception as e:
#             logger.error("safe_get unexpected error: %s — %s", url, e)
#             return fallback

#         if attempt < retries - 1:
#             time.sleep(backoff * (attempt + 1))

#     if last_exc:
#         logger.error("safe_get exhausted retries: %s — %s", url, last_exc)
#     return fallback
