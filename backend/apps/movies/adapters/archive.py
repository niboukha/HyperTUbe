# movies/adapters/archive.py
import requests

BASE_URL = "https://archive.org/advancedsearch.php"

GENRE_SUBJECTS = {
    28:    "action",       16: "animation",
    27:    "horror",       878: "science fiction",
    10752: "war",          35: "comedy",
    18:    "drama",        9648: "mystery",
    80:    "crime",        10749: "romance",
}

def _normalize(doc: dict) -> dict:
    identifier = doc.get("identifier", "")
    return {
        "id":           f"archive-{identifier}",
        "archive_id":   identifier,
        "title":        doc.get("title", ""),
        "overview":     doc.get("description", ""),
        "year":         str(doc.get("year", "")),
        "rating":       0,
        "vote_count":   0,
        "genre_ids":    [],
        "poster_path":  f"https://archive.org/services/img/{identifier}",
        "source":       "archive",
        "is_premium":   False,
        "is_watchable": True,
        "watch_url":    f"https://archive.org/details/{identifier}",
    }

def fetch_movies(search=None, genre_id=None, year=None,
                 sort_by="downloads", page=1, rows=20):
    query_parts = ["collection:moviesandfilms", "mediatype:movies"]

    if search:
        query_parts.append(f"title:({search})")
    if genre_id and genre_id in GENRE_SUBJECTS:
        query_parts.append(f"subject:({GENRE_SUBJECTS[genre_id]})")
    if year:
        query_parts.append(f"year:{year}")

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
    docs = r.json().get("response", {}).get("docs", [])
    return [_normalize(d) for d in docs]