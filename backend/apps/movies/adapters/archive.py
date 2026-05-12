# movies/adapters/archive.py
import math

import requests

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

def is_safe_content(doc):
    text = " ".join([
        str(doc.get("title", "")),
        str(doc.get("description", "")),
        " ".join(doc.get("subject", []))
        if isinstance(doc.get("subject"), list)
        else str(doc.get("subject", "")),
    ]).lower()

    return not any(term in text for term in BLOCKED_TERMS)

def is_quality_movie(doc):
    downloads = doc.get("downloads") or 0

    return (
        downloads > 100 and
        doc.get("title") and
        doc.get("year")
    )

def _normalize(doc: dict) -> dict:
    identifier = doc.get("identifier", "")

    # subjects can be string | list | missing
    subjects = doc.get("subject", [])

    if isinstance(subjects, str):
        subjects = [subjects]

    subjects = [s.lower() for s in subjects if isinstance(s, str)]

    # map archive subjects -> tmdb genre ids
    genre_ids = [
        genre_id
        for genre_id, genre_name in GENRE_SUBJECTS.items()
        if any(genre_name.lower() in s for s in subjects)
    ]

    # description can be list/string
    description = doc.get("description", "")

    if isinstance(description, list):
        description = " ".join(description)

    downloads = doc.get("downloads") or 0

    return {
    "id"                : f"archive-{identifier}",
        "archive_id"    : identifier,
        "type"          : "movie",
        "title"         : doc.get("title", ""),
        "overview"      : description,
        "year"          : str(doc.get("year", "")),
        # fake popularity-based rating
        "rating"        : round(min(math.log10(downloads + 1) * 1.2, 10), 1),
        "vote_count"    : downloads,
        "genre_ids"     : genre_ids,
        "poster_path"   : (
            f"https://archive.org/services/img/{identifier}"
            if identifier else None
        ),
        "backdrop_path"  : None,
        "source"         : "archive",
        "availability"   : "free",
        "is_watchable"   : True,
        "watch_url"      : f"https://archive.org/details/{identifier}",
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

    return [_normalize(d) for d in docs], total_pages
