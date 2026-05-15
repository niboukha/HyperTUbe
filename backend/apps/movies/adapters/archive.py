# movies/adapters/archive.py
import logging
import math
import re

from ..cache.movie_cache import (
    NOT_FOUND,
    acquire_fetch_lock,
    get_archive_detail, set_archive_detail, set_archive_detail_not_found,
    get_archive_downloads,
    get_archive_runtime, set_archive_runtime,
)
from ..client import safe_get
from ..services.utils import build_response, format_runtime

logger   = logging.getLogger(__name__)
BASE_URL = "https://archive.org/advancedsearch.php"

GENRE_SUBJECTS = {
    28: "action", 16: "animation", 27: "horror", 878: "science fiction",
    10752: "war", 35: "comedy", 9648: "mystery", 80: "crime",
}
BLOCKED_PATTERN = re.compile(
    r"\b(adult|xxx|porn|sex|erotic|nsfw|fetish|nude|nudity|hardcore)\b", re.IGNORECASE
)
BLOCKED_TITLES = {
    "cosmos: war of the planets", "het is weer zomer in zandvoort!",
    "teaserama", "adı vasfiye, turkish movie", "desire", "mark of zorro",
    "raw force [1982] - trailer", "maken-ki! battling venus",
}


# ── Quality gates ─────────────────────────────────────────────────────────────

def is_safe_content(doc: dict) -> bool:
    title = str(doc.get("title", ""))
    if title.lower() in BLOCKED_TITLES:
        return False
    text = " ".join([
        title, str(doc.get("description", "")),
        " ".join(doc.get("subject", [])) if isinstance(doc.get("subject"), list)
        else str(doc.get("subject", "")),
    ])
    return len(text.strip()) >= 20 and not BLOCKED_PATTERN.search(text)

def is_quality_movie(doc: dict) -> bool:
    return (doc.get("downloads") or 0) > 100 and doc.get("title") and doc.get("year")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_subjects(doc: dict) -> list[str]:
    s = doc.get("subject", [])
    if isinstance(s, str):
        s = [x.strip() for x in re.split(r"[;,]", s)]
    return [x.lower() for x in s if isinstance(x, str)]

def _subjects_to_genre_ids(subjects: list[str]) -> list[int]:
    return [gid for gid, name in GENRE_SUBJECTS.items()
            if any(name.lower() in s for s in subjects)]

def _parse_description(doc: dict) -> str:
    d = doc.get("description", "")
    return (" ".join(d) if isinstance(d, list) else d).strip()

def _fake_rating(downloads: int) -> float:
    return round(min(math.log10(downloads + 1) * 1.2, 10), 1) if downloads > 0 else 0.0

def _parse_cast(doc: dict) -> list:
    cast, seen = [], set()
    def add(name: str, role: str):
        name = name.strip()
        if not name or name.lower() in seen: return
        seen.add(name.lower())
        cast.append({"id": abs(hash(name)), "name": name, "character": role,
                     "profile_path": None, "order": len(cast)})
    director = doc.get("director") or doc.get("creator")
    if director:
        for d in (director if isinstance(director, list) else [director]):
            add(d, "Director")
    for field in ("contributor", "cast", "performer"):
        raw = doc.get(field, "")
        if not raw: continue
        entries = raw if isinstance(raw, list) else [x.strip() for x in re.split(r"[;,]", raw)]
        for e in entries:
            if e: add(e, "Cast")
    return cast


# ── Normalizers ───────────────────────────────────────────────────────────────

def _normalize_list(doc: dict) -> dict:
    identifier = doc.get("identifier", "")
    subjects   = _parse_subjects(doc)
    downloads  = doc.get("downloads") or 0
    return {
        "id":            f"archive-{identifier}",
        "type":          "movie",
        "archive_id":    identifier,
        "source":        "archive",
        "availability":  "free",
        "title":         doc.get("title") or "Unavailable",
        "overview":      _parse_description(doc)[:300],
        "year":          str(doc.get("year", "")),
        "rating":        _fake_rating(downloads),
        "vote_count":    downloads,
        "genre_ids":     _subjects_to_genre_ids(subjects),
        "poster_path":   f"https://archive.org/services/img/{identifier}" if identifier else None,
        "backdrop_path": None,
        "runtime":       format_runtime(doc.get("runtime")),
        "watch_url":     f"https://archive.org/details/{identifier}",
    }

def _normalize_detail(doc: dict, downloads: int = 0) -> dict:
    identifier = doc.get("identifier", "")
    subjects   = _parse_subjects(doc)
    genre_ids  = _subjects_to_genre_ids(subjects)
    downloads  = downloads or doc.get("downloads") or 0
    return {
        "id":             f"archive-{identifier}",
        "type":           "movie",
        "archive_id":     identifier,
        "source":         "archive",
        "availability":   "free",
        "cast":           _parse_cast(doc),
        "title":          doc.get("title") or "Unavailable",
        "original_title": doc.get("title") or "",
        "tagline":        "",
        "overview":       _parse_description(doc) or "Data temporarily unavailable",
        "year":           str(doc.get("year") or (doc.get("date") or "")[:4]),
        "release_date":   doc.get("date"),
        "runtime":        format_runtime(doc.get("runtime")),
        "status":         "Released",
        "poster_path":    f"https://archive.org/services/img/{identifier}" if identifier else None,
        "backdrop_path":  None,
        "rating":         _fake_rating(downloads),
        "vote_count":     downloads,
        "popularity":     downloads,
        "genre_ids":      genre_ids,
        "genres":         [{"id": gid, "name": GENRE_SUBJECTS.get(gid, "").title()}
                           for gid in genre_ids],
        "collection":     None,
        "studios":        [doc["publisher"]] if doc.get("publisher") else [],
        "countries":      [], "languages":  [],
        "watch_url":      f"https://archive.org/details/{identifier}",
        "director":       doc.get("director") or doc.get("creator"),
        "subjects":       subjects,
    }

def _stub_detail(archive_id: str) -> dict:
    """Safe placeholder returned while background fetch is pending."""
    return {
        "id": f"archive-{archive_id}", "type": "movie",
        "archive_id": archive_id, "source": "archive",
        "availability": "free", "cast": [],
        "title": "Loading...", "original_title": "",
        "tagline": "", "overview": "Details are being fetched, please refresh shortly.",
        "year": "", "release_date": None,
        "runtime": "N/A", "status": "Released",
        "poster_path": f"https://archive.org/services/img/{archive_id}",
        "backdrop_path": None,
        "rating": 0.0, "vote_count": 0, "popularity": 0,
        "genre_ids": [], "genres": [], "collection": None,
        "studios": [], "countries": [], "languages": [],
        "watch_url": f"https://archive.org/details/{archive_id}",
        "director": None, "subjects": [],
        "_pending": True,   # frontend can poll if it sees this
    }


# ── Public fetch API ──────────────────────────────────────────────────────────

def fetch_movies(search: str = None, genre_ids: list = None, year: int = None,
                 sort_by: str = "downloads", page: int = 1, rows: int = 20) -> dict:
    """List fetch — real-time but fast (search index, not metadata)."""
    parts = ["collection:moviesandfilms", "mediatype:movies"]
    if search:    parts.append(f"title:({search})")
    if genre_ids:
        subjects = [GENRE_SUBJECTS[g] for g in genre_ids if g in GENRE_SUBJECTS]
        if subjects:
            parts.append("(" + " OR ".join(f"subject:{s}" for s in subjects) + ")")
    if year:      parts.append(f"year:{year}")

    sort_map = {"downloads": "downloads desc", "year": "year desc", "title": "title asc"}
    body = safe_get(BASE_URL, params={
        "q": " AND ".join(parts),
        "fl[]": "identifier,title,description,year,subject,downloads",
        "sort[]": sort_map.get(sort_by, "downloads desc"),
        "rows": rows, "page": page, "output": "json",
    }, timeout=8, retries=2, fallback={})

    response = (body or {}).get("response", {})
    docs     = [d for d in response.get("docs", [])
                if is_safe_content(d) and is_quality_movie(d)]

    # Kick off background prefetch for any uncached items
    _prefetch_uncached([d["identifier"] for d in docs if d.get("identifier")])

    return build_response(response, [_normalize_list(d) for d in docs])


def _prefetch_uncached(identifiers: list[str]) -> None:
    """Queue background tasks for movies not yet in cache — fire and forget."""
    from ..tasks import fetch_archive_detail_task
    for archive_id in identifiers:
        if get_archive_detail(archive_id) is None:
            if acquire_fetch_lock(archive_id):
                fetch_archive_detail_task.delay(archive_id)


def fetch_detail(archive_id: str) -> dict:
    """
    Cache-first detail fetch.
    States:
      HIT     → return immediately
      NOT_FOUND sentinel → return None
      MISS    → return stub + queue background fetch
    """
    cached = get_archive_detail(archive_id)

    if cached is not None:
        if cached == NOT_FOUND:
            return None
        return cached  # cache hit

    # Cache miss — queue background fetch, return stub immediately
    if acquire_fetch_lock(archive_id):
        from ..tasks import fetch_archive_detail_task
        fetch_archive_detail_task.delay(archive_id)
        logger.info("fetch_detail: queued background fetch for %s", archive_id)

    return _stub_detail(archive_id)


def fetch_runtime(archive_id: str) -> str:
    """Runtime — cache only, queue background refresh on miss."""
    cached = get_archive_runtime(archive_id)
    if cached is not None:
        return cached

    # Queue a lightweight background task
    if acquire_fetch_lock(f"runtime:{archive_id}", ttl=15):
        from ..tasks import fetch_archive_runtime_task
        fetch_archive_runtime_task.delay(archive_id)

    return "N/A"