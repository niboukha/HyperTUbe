import re

import requests
from django.conf import settings

TMDB_BASE = "https://api.themoviedb.org/3"
HEADERS = { "Authorization": f"Bearer {settings.TMDB_TOKEN}" }
GENRE_MAP = {
    28: "Action",
    16: "Animation",
    27: "Horror",
    878: "Science Fiction",
    10752: "War",
    35: "Comedy",
    80: "Crime",
    9648: "Mystery",
}
BLOCKED_GENRE_IDS = {
    10749,  # Romance
    18,     # Drama
    53,     # Thriller
    99,     # Documentary
}
ADULT_KEYWORDS = re.compile(
    r"\b(xxx|porn|erotic|sex|adult|nude|naked|hentai)\b",
    re.IGNORECASE
)
MIN_VOTE_COUNT = 10
MIN_POPULARITY = 2

def is_quality_movie(movie: dict) -> bool:
    title = movie.get("title") or movie.get("name") or ""

    if movie.get("adult"):
        return False
    if not title:
        return False
    if ADULT_KEYWORDS.search(title):
        return False
    
    genre_ids = movie.get("genre_ids", [])

    if any(g in BLOCKED_GENRE_IDS for g in genre_ids):
        return False
    return True


def _normalize(movie: dict) -> dict:
    return {
        "id":          f"tmdb-{movie['id']}",
        "type":        "movie",
        "tmdb_id":     movie["id"],
        "title":       movie.get("title", ""),
        "overview":    movie.get("overview", ""),
        "year":        (movie.get("release_date") or "")[:4],
        "rating":       round(float(movie.get("vote_average") or 0), 1),
        "vote_count":  movie.get("vote_count", 0),
        "genre_ids":   movie.get("genre_ids", []),
        "poster_path": f"https://image.tmdb.org/t/p/original{movie['poster_path']}"
                       if movie.get("poster_path") else None,
        "backdrop_path": f"https://image.tmdb.org/t/p/original{movie['backdrop_path']}"
                         if movie.get("backdrop_path") else None,
        "source":      "tmdb",
        "availability":  "premium",
        "is_watchable": True,
    }

def _filtered_results(results):
    return [
        _normalize(movie)
        for movie in results
        if is_quality_movie(movie)
    ]

def fetch_trending(page=1):
    r = requests.get(f"{TMDB_BASE}/trending/movie/week",
                     headers=HEADERS, params={"page": page})
    body = r.json()
    return _filtered_results(body.get("results", [])), body.get("total_pages", 1)

def fetch_by_type(type_: str, page=1):
    if type_ == "trending":
        r = requests.get(f"{TMDB_BASE}/trending/movie/week",
                         headers=HEADERS, params={"page": page})
    else:
        r = requests.get(f"{TMDB_BASE}/movie/{type_}",
                         headers=HEADERS, params={"page": page})
    body = r.json()
    return _filtered_results(body.get("results", [])), body.get("total_pages", 1)

def fetch_by_genre(genre_ids: list, page=1):
    r = requests.get(f"{TMDB_BASE}/discover/movie", headers=HEADERS,
                     params={"with_genres": ",".join(str(id) for id in genre_ids), "page": page,
                             "sort_by": "popularity.desc"})
    body = r.json()
    return _filtered_results(body.get("results", [])), body.get("total_pages", 1)

def search( query="", genre_ids=None, year_from=None, year_to=None, sort_by="popularity", page=1 ):
    if query:
        r = requests.get(
            f"{TMDB_BASE}/search/movie",
            headers=HEADERS,
            params={
                "query": query,
                "page": page,
                "include_adult": False,
            }
        )
    else:
        sort_map = {
            "rating":                    "vote_average.desc",
            "primary_release_date_desc": "primary_release_date.desc",
            "primary_release_date_asc":  "primary_release_date.asc",
            "popularity":                "popularity.desc",
        }
        params = {
            "page": page,
            "sort_by": sort_map.get(sort_by, "popularity.desc"),
            "include_adult": False,
            "vote_count.gte": MIN_VOTE_COUNT,
        }
        if genre_ids:   params["with_genres"] = ",".join(str(id) for id in genre_ids)
        if year_from:  params["primary_release_date.gte"] = f"{year_from}-01-01"
        if year_to:    params["primary_release_date.lte"] = f"{year_to}-12-31"

        r = requests.get(f"{TMDB_BASE}/discover/movie", headers=HEADERS, params=params)
        
    body        = r.json()
    total_pages = min(body.get("total_pages", 1), 500)  # TMDB caps at 500
    results     = _filtered_results(body.get("results", []))
    return results, total_pages          

