import math
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from urllib.parse import unquote

import requests

from ..services.utils import build_response, format_runtime, text_value

BASE_URL = "https://archive.org/advancedsearch.php"

GENRE_SUBJECTS = {
    28:    "action",
    16:    "animation",
    27:    "horror",
    878:   "science fiction",
    10752: "war",
    35:    "comedy",
    9648:  "mystery",
    80:    "crime",
}

BLOCKED_TERMS = [
    "adult", "xxx", "porn", "sex", "erotic",
    "erotik", "nsfw", "fetish", "nude", "nudity",
    "naked", "hentai", "softcore", "hardcore",
]
BLOCKED_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in BLOCKED_TERMS) + r")\b",
    re.IGNORECASE,
)
BLOCKED_TITLES = {
    "cosmos: war of the planets",
    "het is weer zomer in zandvoort!",
    "teaserama",
    "adı vasfiye, turkish movie",
    "desire",
    "mark of zorro",
    "raw force [1982] - trailer",
    "maken-ki! battling venus",
    "maken-ki! battling venus - trailer",
}

# Only the fields we actually use — keeps the Archive response small and fast
_FETCH_FIELDS = [
    "identifier", "title", "description", "year",
    "subject", "downloads", "runtime",
]
_DETAIL_FIELDS = _FETCH_FIELDS + [
    "date", "publisher", "creator", "director",
    "licenseurl", "color", "sound",
]
_UNAVAILABLE = object()


def is_safe_content(doc: dict) -> bool:
    title = text_value(doc.get("title"))
    if title.lower() in BLOCKED_TITLES:
        return False

    text = " ".join([
        title,
        text_value(doc.get("description")),
        text_value(doc.get("subject")),
    ])
    if len(text.strip()) < 20:
        return False
    return not BLOCKED_PATTERN.search(text)


def is_quality_movie(doc: dict) -> bool:
    return (
        (doc.get("downloads") or 0) > 100
        and bool(doc.get("title"))
        and bool(doc.get("year"))
    )


def _parse_subjects(doc: dict) -> list[str]:
    s = doc.get("subject", [])
    if isinstance(s, str):
        s = [x.strip() for x in re.split(r"[;,]", s)]
    return [x.lower() for x in s if isinstance(x, str)]


def _subjects_to_genre_ids(subjects: list[str]) -> list[int]:
    return [
        gid for gid, name in GENRE_SUBJECTS.items()
        if any(name.lower() in s for s in subjects)
    ]


def _parse_description(doc: dict) -> str:
    return text_value(doc.get("description"))


def _normalize_list(doc: dict) -> dict:
    identifier  = text_value(doc.get("identifier"))
    subjects    = _parse_subjects(doc)
    genre_ids   = _subjects_to_genre_ids(subjects)
    downloads   = doc.get("downloads") or 0
    description = _parse_description(doc)

    return {
        "id":           f"archive-{identifier}",
        "type":         "movie",
        "archive_id":   identifier,
        "source":       "archive",
        "availability": "free",
        "title":        text_value(doc.get("title")),
        "overview":     description[:300] if description else "",
        "year":         str(doc.get("year", "")),
        "rating":       round(min(math.log10(downloads + 1) * 1.2, 10), 1),
        "vote_count":   downloads,
        "popularity":   downloads,
        "genre_ids":    genre_ids,
        "poster_path":  f"https://archive.org/services/img/{identifier}" if identifier else None,
        "backdrop_path": None,
        "runtime":      format_runtime(doc.get("runtime")),
        "watch_url":    f"https://archive.org/details/{identifier}",
    }


def _normalize_detail(doc: dict) -> dict:
    identifier  = text_value(doc.get("identifier"))
    subjects    = _parse_subjects(doc)
    genre_ids   = _subjects_to_genre_ids(subjects)
    downloads   = doc.get("downloads") or 0
    description = _parse_description(doc)

    return {
        "id":             f"archive-{identifier}",
        "type":           "movie",
        "archive_id":     identifier,
        "source":         "archive",
        "availability":   "free",
        "title":          text_value(doc.get("title")),
        "original_title": text_value(doc.get("title")),
        "tagline":        "",
        "overview":       description,
        "year":           str(doc.get("year") or (doc.get("date", "") or "")[:4]),
        "release_date":   doc.get("date"),
        "runtime":        format_runtime(doc.get("runtime")),
        "runtime_mins":   None,
        "status":         "Released",
        "poster_path":    f"https://archive.org/services/img/{identifier}" if identifier else None,
        "backdrop_path":  None,
        "rating":         round(min(math.log10(downloads + 1) * 1.2, 10), 1),
        "vote_count":     downloads,
        "popularity":     downloads,
        "genre_ids":      genre_ids,
        "genres":         [
                              {"id": gid, "name": GENRE_SUBJECTS.get(gid, "").title()}
                              for gid in genre_ids
                          ],
        "collection":     None,
        "studios":        [text_value(doc.get("publisher"))] if doc.get("publisher") else [],
        "countries":      [],
        "languages":      [],
        "budget":         None,
        "revenue":        None,
        "homepage":       None,
        "watch_url":      f"https://archive.org/details/{identifier}",
        "director":       text_value(doc.get("director") or doc.get("creator")),
        "license":        text_value(doc.get("licenseurl")),
        "color":          text_value(doc.get("color")),
        "sound":          text_value(doc.get("sound")),
        "subjects":       subjects,
    }


def fetch_movies(
    search: str = None,
    genre_ids: list = None,
    year: int = None,
    year_from: int = None,
    year_to: int = None,
    sort_by: str = "downloads",
    page: int = 1,
    rows: int = 20,
    timeout: float = 8.0,
) -> dict:
    query_parts = ["collection:moviesandfilms", "mediatype:movies"]

    if search:
        query_parts.append(f"title:({search})")
    if genre_ids:
        subjects = [GENRE_SUBJECTS[g] for g in genre_ids if g in GENRE_SUBJECTS]
        if subjects:
            query_parts.append(
                "(" + " OR ".join(f"subject:{s}" for s in subjects) + ")"
            )
    if year:
        query_parts.append(f"year:{year}")
    elif year_from or year_to:
        start = year_from or 0
        end   = year_to or 9999
        query_parts.append(f"year:[{start} TO {end}]")

    sort_map = {
        "downloads": "downloads desc",
        "year":      "year desc",
        "year_asc":  "year asc",
        "title":     "title asc",
        "name":      "title asc",
    }

    params = {
        "q":      " AND ".join(query_parts),
        "fl[]":   _FETCH_FIELDS,          # ← only what we need
        "sort[]": sort_map.get(sort_by, "downloads desc"),
        "rows":   rows,
        "page":   page,
        "output": "json",
    }

    try:
        r = requests.get(BASE_URL, params=params, timeout=timeout)
        r.raise_for_status()
    except requests.Timeout:
        return build_response({}, [])
    except requests.RequestException:
        return build_response({}, [])

    body      = r.json().get("response", {})
    num_found = body.get("numFound", 0)
    docs      = [
        d for d in body.get("docs", [])
        if is_safe_content(d) and is_quality_movie(d)
    ]

    return build_response(body, [_normalize_list(d) for d in docs])


def fetch_detail(archive_id: str) -> dict | None:
    from ..cache.movie_cache import NOT_FOUND, get_detail, set_detail

    cache_key = f"archive-{archive_id}"
    cached = get_detail(cache_key)
    if cached == NOT_FOUND:
        return None
    if cached:
        return cached

    data, should_retry = _fetch_detail_live(archive_id)
    if data:
        set_detail(cache_key, data)
        return data

    if should_retry:
        # Archive.org is often slow from the request cycle. Returning a temporary
        # detail object lets the frontend keep polling instead of showing a false 404.
        return _pending_detail(archive_id)

    return None


def _fetch_detail_live(archive_id: str) -> tuple[dict | None, bool]:
    metadata = None
    search_doc = None
    should_retry = False

    with ThreadPoolExecutor(max_workers=2) as pool:
        metadata_f = pool.submit(_fetch_detail_metadata, archive_id)
        search_f = pool.submit(_fetch_detail_search_doc, archive_id)

        try:
            metadata_result = metadata_f.result(timeout=9)
        except (FutureTimeout, Exception):
            metadata_result = _UNAVAILABLE

        try:
            search_result = search_f.result(timeout=9)
        except (FutureTimeout, Exception):
            search_result = _UNAVAILABLE

    if metadata_result is _UNAVAILABLE:
        should_retry = True
    elif metadata_result:
        metadata = metadata_result

    if search_result is _UNAVAILABLE:
        should_retry = True
    elif search_result:
        search_doc = search_result

    if metadata and search_doc:
        if not metadata.get("downloads"):
            metadata["downloads"] = search_doc.get("downloads") or 0
        if not metadata.get("year"):
            metadata["year"] = search_doc.get("year")
        if not metadata.get("description"):
            metadata["description"] = search_doc.get("description")

    doc = metadata or search_doc
    if not doc:
        return None, should_retry

    doc["identifier"] = text_value(doc.get("identifier"), archive_id)
    if not is_safe_content(doc):
        return None, False
    return _normalize_detail(doc), False


def _fetch_detail_metadata(archive_id: str) -> dict | None | object:
    try:
        r = requests.get(
            f"https://archive.org/metadata/{archive_id}",
            timeout=8,
        )
        r.raise_for_status()
    except (requests.Timeout, requests.ConnectionError):
        return _UNAVAILABLE
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        return None if status_code == 404 else _UNAVAILABLE
    except requests.RequestException:
        return _UNAVAILABLE

    try:
        body = r.json()
    except ValueError:
        return _UNAVAILABLE

    if isinstance(body, dict) and body.get("error"):
        return None

    try:
        metadata = _metadata_payload(body)
    except ValueError:
        return _UNAVAILABLE

    if not metadata:
        return None
    metadata["identifier"] = text_value(metadata.get("identifier"), archive_id)
    return metadata


def _fetch_detail_search(archive_id: str) -> dict | None:
    doc = _fetch_detail_search_doc(archive_id)
    if not doc or doc is _UNAVAILABLE:
        return None

    doc["identifier"] = text_value(doc.get("identifier"), archive_id)
    if not is_safe_content(doc):
        return None
    return _normalize_detail(doc)


def _fetch_detail_search_doc(archive_id: str) -> dict | None | object:
    params = {
        "q":      f'identifier:"{archive_id}"',
        "fl[]":   _DETAIL_FIELDS,
        "rows":   1,
        "page":   1,
        "output": "json",
    }
    try:
        r = requests.get(BASE_URL, params=params, timeout=5)
        r.raise_for_status()
        docs = r.json().get("response", {}).get("docs", [])
    except (requests.Timeout, requests.ConnectionError):
        return _UNAVAILABLE
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        return None if status_code and status_code < 500 else _UNAVAILABLE
    except (requests.RequestException, ValueError):
        return _UNAVAILABLE

    if not docs:
        return None

    return docs[0]


def _pending_detail(archive_id: str) -> dict:
    title = unquote(archive_id).replace("_", " ").replace("-", " ").strip()
    title = re.sub(r"\s+", " ", title) or archive_id

    return {
        "_pending":       True,
        "id":             f"archive-{archive_id}",
        "type":           "movie",
        "archive_id":     archive_id,
        "source":         "archive",
        "availability":   "free",
        "title":          title,
        "original_title": title,
        "tagline":        "",
        "overview":       "Archive.org is still loading details for this title.",
        "year":           "",
        "release_date":   None,
        "runtime":        "",
        "runtime_mins":   None,
        "status":         "Loading",
        "poster_path":    f"https://archive.org/services/img/{archive_id}",
        "backdrop_path":  None,
        "rating":         0,
        "vote_count":     0,
        "popularity":     0,
        "genre_ids":      [],
        "genres":         [],
        "collection":     None,
        "studios":        [],
        "countries":      [],
        "languages":      [],
        "budget":         None,
        "revenue":        None,
        "homepage":       None,
        "watch_url":      f"https://archive.org/details/{archive_id}",
        "director":       "",
        "license":        "",
        "color":          "",
        "sound":          "",
        "subjects":       [],
    }


def _metadata_payload(body: dict) -> dict:
    if not isinstance(body, dict):
        return {}
    if isinstance(body.get("metadata"), dict):
        return dict(body["metadata"])
    if isinstance(body.get("result"), dict):
        return dict(body["result"])
    return dict(body)
