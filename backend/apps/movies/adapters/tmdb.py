import json
import re
import requests

from django.conf import settings
from ..services.utils import build_response, format_runtime

TMDB_BASE = "https://api.themoviedb.org/3"
HEADERS   = {"Authorization": f"Bearer {settings.TMDB_TOKEN}"}

# Genre ids we allow in results
GENRE_MAP = {28: "Action", 16: "Animation", 27: "Horror", 878: "Science Fiction",
             10752: "War", 35: "Comedy", 80: "Crime", 9648: "Mystery"}

BLOCKED_GENRE_IDS = {10749, 18, 53, 99}  # Romance, Drama, Thriller, Documentary
BLOCKED_TITLES    = {"cosmos: war of the planets"}
ADULT_KEYWORDS    = re.compile(r"\b(xxx|porn|erotic|sex|adult|nude|naked|hentai)\b", re.IGNORECASE)
MIN_VOTE_COUNT    = 10
MIN_POPULARITY    = 2

# Quality gate ----------------------------------------------------

def is_quality_movie(movie: dict) -> bool:
    title = movie.get("title") or movie.get("name") or ""
    if movie.get("adult"):                                      return False
    if not title:                                               return False
    if ADULT_KEYWORDS.search(title):                            return False
    if title.lower() in BLOCKED_TITLES:                         return False
    if any(g in BLOCKED_GENRE_IDS for g in movie.get("genre_ids", [])):
                                                                return False
    return True

# Normalizers ------------------------------------------------------

def _normalize_list(movie: dict) -> dict:
    """Lean shape used by cards and carousels."""
    return {
        "id":            f"tmdb-{movie['id']}",
        "type":          "movie",
        "tmdb_id":       movie["id"],
        "source":        "tmdb",
        "availability":  "premium",
        "title":         movie.get("title", ""),
        "overview":      movie.get("overview", ""),
        "year":          (movie.get("release_date") or "")[:4],
        "rating":        round(float(movie.get("vote_average") or 0), 1),
        "vote_count":    movie.get("vote_count", 0),
        "genre_ids":     movie.get("genre_ids", []),
        "poster_path":   f"https://image.tmdb.org/t/p/original{movie['poster_path']}"
                         if movie.get("poster_path") else None,
        "backdrop_path": f"https://image.tmdb.org/t/p/original{movie['backdrop_path']}"
                         if movie.get("backdrop_path") else None,
        "runtime":       format_runtime(movie.get("runtime")),
    }


def _normalize_detail(movie: dict) -> dict:
    """Full shape for the detail page."""
    return {
        "id":             f"tmdb-{movie['id']}",
        "type":           "movie",
        "tmdb_id":        movie["id"],
        "imdb_id":        movie.get("imdb_id"),
        "source":         "tmdb",
        "availability":   "premium",
        "title":          movie.get("title", ""),
        "original_title": movie.get("original_title", ""),
        "tagline":        movie.get("tagline", ""),
        "overview":       movie.get("overview", ""),
        "year":           (movie.get("release_date") or "")[:4],
        "release_date":   movie.get("release_date"),
        "runtime":        format_runtime(movie.get("runtime")),
        "poster_path":    f"https://image.tmdb.org/t/p/original{movie['poster_path']}"
                          if movie.get("poster_path") else None,
        "backdrop_path":  f"https://image.tmdb.org/t/p/original{movie['backdrop_path']}"
                          if movie.get("backdrop_path") else None,
        "rating":         round(float(movie.get("vote_average") or 0), 1),
        "vote_count":     movie.get("vote_count", 0),
        "popularity":     movie.get("popularity"),
        "genres":         movie.get("genres", []),
        "genre_ids":      [g["id"] for g in movie.get("genres", [])],
        "collection":     movie.get("belongs_to_collection"),
        "languages":      [l["english_name"] for l in movie.get("spoken_languages", [])],
    }

def _filtered_results(results: list) -> list:
    return [_normalize_list(m) for m in results if is_quality_movie(m)]

# Fetch helpers ------------------------------------------------------
def fetch_by_type(type_: str, page: int = 1) -> dict:
    """trending | top_rated | popular | now_playing | upcoming"""
    url = (f"{TMDB_BASE}/trending/movie/week"
           if type_ == "trending"
           else f"{TMDB_BASE}/movie/{type_}")
    body = requests.get(url, headers=HEADERS, params={"page": page}).json()
    return build_response(body, _filtered_results(body.get("results", [])))

def fetch_by_genre(genre_ids: list, page: int = 1) -> dict:
    body = requests.get(
        f"{TMDB_BASE}/discover/movie", headers=HEADERS,
        params={"with_genres": ",".join(str(i) for i in genre_ids),
                "page": page, "sort_by": "popularity.desc"},
    ).json()
    return build_response(body, _filtered_results(body.get("results", [])))


def search(query: str = "", genre_ids: list = None, year_from: int = None,
           year_to: int = None, sort_by: str = "popularity", page: int = 1) -> dict:
    if query:
        body = requests.get(
            f"{TMDB_BASE}/search/movie", headers=HEADERS,
            params={"query": query, "page": page, "include_adult": False},
        ).json()
    else:
        sort_map = {
            "rating":                    "vote_average.desc",
            "primary_release_date_desc": "primary_release_date.desc",
            "primary_release_date_asc":  "primary_release_date.asc",
            "popularity":                "popularity.desc",
        }
        params = {"page": page, "sort_by": sort_map.get(sort_by, "popularity.desc"),
                  "include_adult": False, "vote_count.gte": MIN_VOTE_COUNT}
        if genre_ids: params["with_genres"] = ",".join(str(i) for i in genre_ids)
        if year_from: params["primary_release_date.gte"] = f"{year_from}-01-01"
        if year_to:   params["primary_release_date.lte"] = f"{year_to}-12-31"
        body = requests.get(f"{TMDB_BASE}/discover/movie",
                            headers=HEADERS, params=params).json()

    return build_response(body, _filtered_results(body.get("results", [])))

def fetch_detail(tmdb_id: int) -> dict | None:
    r = requests.get(f"{TMDB_BASE}/movie/{tmdb_id}", headers=HEADERS)

    # print(json.dumps(movie, indent=2, ensure_ascii=False))

    if r.status_code != 200:
        return None
    return _normalize_detail(r.json())

def fetch_credits(tmdb_id: int) -> dict:
    r = requests.get(f"{TMDB_BASE}/movie/{tmdb_id}/credits", headers=HEADERS)
    if r.status_code != 200:
        return {"cast": [], "crew": {"directors": [], "producers": []}}

    data = r.json()
    cast = [
        {"id": p["id"], "name": p.get("name", ""),
         "character": p.get("character", ""),
         "profile_path": f"https://image.tmdb.org/t/p/w185{p['profile_path']}"
                         if p.get("profile_path") else None}
        for p in data.get("cast", [])[:15]
        if p.get("known_for_department") == "Acting"
    ]
    crew = data.get("crew", [])
    return {
        "cast": cast,
        "crew": {
            "directors": [c for c in crew if c.get("job") == "Director"],
            "producers": [c for c in crew if "Producer" in c.get("job", "")],
        },
    }

def fetch_collection(collection_id: int) -> dict | None:
    r = requests.get(f"{TMDB_BASE}/collection/{collection_id}", headers=HEADERS)
    if r.status_code != 200:
        return None
    body  = r.json()
    parts = [_normalize_list(m) for m in body.get("parts", []) if is_quality_movie(m)]
    return {
        "id":            body.get("id"),
        "name":          body.get("name", ""),
        "overview":      body.get("overview", ""),
        "poster_path":   f"https://image.tmdb.org/t/p/original{body['poster_path']}"
                         if body.get("poster_path") else None,
        "backdrop_path": f"https://image.tmdb.org/t/p/original{body['backdrop_path']}"
                         if body.get("backdrop_path") else None,
        "parts":         parts,
    }

def fetch_runtime(tmdb_id: int) -> str:
    """Single lightweight call — only needs runtime field."""
    r = requests.get(f"{TMDB_BASE}/movie/{tmdb_id}",
                     headers=HEADERS,
                     params={"fields": "runtime"})  # TMDB ignores this but keeps intent clear
    if r.status_code != 200:
        return "N/A"
    return format_runtime(r.json().get("runtime"))
