# movies/adapters/archive.py
import json
import math
import re

import requests

from ..services.utils import build_response, format_runtime

BASE_URL = "https://archive.org/advancedsearch.php"
GENRE_SUBJECTS = {
    28:    "action",       16: "animation",
    27:    "horror",       878: "science fiction",
    10752: "war",          35: "comedy",
    9648: "mystery",       80:    "crime",
}
BLOCKED_TERMS = [
    "adult",
    "xxx",
    "porn",
    "sex",
    "erotic",
    "nsfw",
    "fetish",
    "nude",
    "nudity",
    "hardcore",
]
BLOCKED_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in BLOCKED_TERMS) + r")\b",
    re.IGNORECASE,
)
BLOCKED_TITLES = {
    "cosmos: war of the planets",
    "Het is weer zomer in Zandvoort!",
    "Teaserama",
    "Adı Vasfiye, Turkish Movie",
    "Desire",
    "Mark of Zorro",
    "Raw Force [1982] - Trailer",
    "Maken-Ki! Battling Venus",
    "Maken-Ki! Battling Venus - Trailer",
}

def is_safe_content(doc):
    text = " ".join([
        str(doc.get("title", "")),
        str(doc.get("description", "")),
        " ".join(doc.get("subject", []))
        if isinstance(doc.get("subject"), list)
        else str(doc.get("subject", "")),
    ])

    if str(doc.get("title", "")).lower() in BLOCKED_TITLES or str(doc.get("description", "")) in BLOCKED_TERMS or BLOCKED_PATTERN.search(text) or str(doc.get("title", "")).lower() in BLOCKED_TERMS:
        return False
    
    text = text.lower().strip()
    if len(text) < 20:
        return False
    if BLOCKED_PATTERN.search(text):
        return False

    return True

def is_quality_movie(doc):
    downloads = doc.get("downloads") or 0

    return (
        downloads > 100 and
        doc.get("title") and
        doc.get("year")
    )

def _normalize_list(doc: dict) -> dict:
    identifier = doc.get("identifier", "")
    subjects   = _parse_subjects(doc)
    genre_ids  = _subjects_to_genre_ids(subjects)
    downloads  = doc.get("downloads") or 0
    description = _parse_description(doc)

    return {
        "id":           f"archive-{identifier}",
        "type":         "movie",
        "archive_id":   identifier,
        "source":       "archive",
        "availability": "free",
        "title":        doc.get("title", ""),
        "overview":     description[:300] if description else "",  # truncate for cards
        "year":         str(doc.get("year", "")),
        "rating":       round(min(math.log10(downloads + 1) * 1.2, 10), 1),
        "vote_count":   downloads,
        "genre_ids":    genre_ids,
        "poster_path":  f"https://archive.org/services/img/{identifier}" if identifier else None,
        "backdrop_path": None,
        "runtime":      format_runtime(doc.get("runtime")),
        "watch_url":    f"https://archive.org/details/{identifier}",
    }

def _normalize_detail(doc: dict) -> dict:
    identifier  = doc.get("identifier", "")
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

        "title":        doc.get("title", ""),
        "original_title": doc.get("title", ""),
        "tagline":      "",
        "overview":     description,
        "year":         str(doc.get("year") or doc.get("date", "")[:4]),
        "release_date": doc.get("date"),
        "runtime":      format_runtime(doc.get("runtime")),
        "runtime_mins": None,
        "status":       "Released",

        "poster_path":  f"https://archive.org/services/img/{identifier}" if identifier else None,
        "backdrop_path": None,

        "rating":       round(min(math.log10(downloads + 1) * 1.2, 10), 1),
        "vote_count":   downloads,
        "popularity":   downloads,

        "genre_ids":    genre_ids,
        "genres":       [
                            {"id": gid, "name": GENRE_SUBJECTS.get(gid, "").title()}
                            for gid in genre_ids
                        ],

        "collection":   None,
        "studios":      [doc.get("publisher", "")] if doc.get("publisher") else [],
        "countries":    [],
        "languages":    [],
        "budget":       None,
        "revenue":      None,
        "homepage":     None,

        "watch_url":    f"https://archive.org/details/{identifier}",
        "director":     doc.get("director") or doc.get("creator"),
        "license":      doc.get("licenseurl"),
        "color":        doc.get("color"),
        "sound":        doc.get("sound"),
        "subjects":     subjects,          # raw subject list for display
    }


def fetch_movies(search=None, genre_ids=None, year=None,
                 sort_by="downloads", page=1, rows=20):
    query_parts = ["collection:moviesandfilms", "mediatype:movies"]

    if search:     query_parts.append(f"title:({search})")
    if genre_ids:
        subjects = [
            GENRE_SUBJECTS[g]
            for g in genre_ids
            if g in GENRE_SUBJECTS
        ]

        if subjects:
            query_parts.append(
                "(" + " OR ".join(f"subject:{s}" for s in subjects) + ")"
            )
    if year:       query_parts.append(f"year:{year}")

    sort_map = {
        "downloads": "downloads desc",
        "year":      "year desc",
        "title":     "title asc",
    }

    params = {
        "q":      " AND ".join(query_parts),
        "fl[]":   "identifier,title,description,year,subject,downloads",
        "sort[]": sort_map.get(sort_by, "downloads desc"),
        "rows":   rows,
        "page":   page,
        "output": "json",
    }
    r = requests.get(BASE_URL, params=params, timeout=10)
    r.raise_for_status()
    
    body        = r.json().get("response", {})
    num_found   = body.get("numFound", 0)
    total_pages = max(1, -(-num_found // rows))   # ceiling division

    docs = [d for d in body.get("docs", [])
            if is_safe_content(d) and is_quality_movie(d)]

    # return {
    #     "results": [_normalize(d) for d in docs],
    #     "page": page,
    #     "total_pages": total_pages,
    #     "total_results": num_found,
    # }

    return build_response(body, [_normalize_list(d) for d in docs])


def fetch_detail(archive_id: str) -> dict | None:
    r = requests.get(f"https://archive.org/metadata/{archive_id}", timeout=10)
    if r.status_code != 200:
        return None
    metadata = r.json().get("metadata", {})
    return _normalize_detail(metadata)

# shared helpers
def _parse_subjects(doc: dict) -> list[str]:
    s = doc.get("subject", [])
    if isinstance(s, str):
        # "Action; Drama; Romance" → ["action", "drama", "romance"]
        s = [x.strip() for x in re.split(r"[;,]", s)]
    return [x.lower() for x in s if isinstance(x, str)]

def _subjects_to_genre_ids(subjects: list[str]) -> list[int]:
    return [
        gid for gid, name in GENRE_SUBJECTS.items()
        if any(name.lower() in s for s in subjects)
    ]

def _parse_description(doc: dict) -> str:
    d = doc.get("description", "")
    if isinstance(d, list):
        d = " ".join(d)
    return d.strip()