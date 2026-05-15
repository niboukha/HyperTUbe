# movies/client.py
import logging
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)

# Safe HTTP wrapper --------------------------------------------------------------------

def safe_get(
    url:      str,
    params:   dict        = None,
    headers:  dict        = None,
    timeout:  int         = 8,
    retries:  int         = 2,
    backoff:  float       = 0.5,
    fallback: Any         = None,
) -> Any:
    """
    GET with retry + timeout. Returns parsed JSON or fallback on any failure.
    Never raises — all exceptions are caught and logged.
    """
    last_exc = None

    for attempt in range(retries):
        try:
            r = requests.get(url, params=params, headers=headers, timeout=timeout)
            if r.status_code == 200:
                return r.json()
            logger.warning("safe_get HTTP %s: %s (attempt %d)", r.status_code, url, attempt + 1)
        except (requests.exceptions.Timeout,
                requests.exceptions.ConnectionError) as e:
            last_exc = e
            logger.warning("safe_get network error: %s — %s (attempt %d)", url, e, attempt + 1)
        except Exception as e:
            logger.error("safe_get unexpected error: %s — %s", url, e)
            return fallback

        if attempt < retries - 1:
            time.sleep(backoff * (attempt + 1))

    if last_exc:
        logger.error("safe_get exhausted retries: %s — %s", url, last_exc)
    return fallback