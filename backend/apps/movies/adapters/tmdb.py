# movies/adapters/tmdb.py
import requests
from django.conf import settings

TMDB_BASE = "https://api.themoviedb.org/3"
HEADERS = {"Authorization": f"Bearer {settings.TMDB_TOKEN}"}

GENRE_MAP = {
    28: "Action", 16: "Animation", 27: "Horror",
    878: "Science Fiction", 10752: "War", 35: "Comedy",
}

def _normalize(movie: dict, is_premium: bool) -> dict:
    return {
        "id":          f"tmdb-{movie['id']}",
        "tmdb_id":     movie["id"],
        "title":       movie.get("title", ""),
        "overview":    movie.get("overview", ""),
        "year":        (movie.get("release_date") or "")[:4],
        "rating":      movie.get("vote_average", 0),
        "vote_count":  movie.get("vote_count", 0),
        "genre_ids":   movie.get("genre_ids", []),
        "poster_path": f"https://image.tmdb.org/t/p/w500{movie['poster_path']}"
                       if movie.get("poster_path") else None,
        "source":      "tmdb",
        "is_premium":  is_premium,
        "is_watchable": not is_premium,
    }

def fetch_trending(page=1):
    r = requests.get(f"{TMDB_BASE}/trending/movie/week",
                     headers=HEADERS, params={"page": page})
    return [_normalize(m, is_premium=True) for m in r.json().get("results", [])]

def fetch_top_rated(page=1):
    r = requests.get(f"{TMDB_BASE}/movie/top_rated",
                     headers=HEADERS, params={"page": page})
    return [_normalize(m, is_premium=True) for m in r.json().get("results", [])]

def fetch_by_genre(genre_id: int, page=1):
    r = requests.get(f"{TMDB_BASE}/discover/movie", headers=HEADERS,
                     params={"with_genres": genre_id, "page": page,
                             "sort_by": "popularity.desc"})
    return [_normalize(m, is_premium=True) for m in r.json().get("results", [])]

def search(query="", genre_id=None, year=None, sort_by="popularity", page=1):
    if query:
        r = requests.get(f"{TMDB_BASE}/search/movie", headers=HEADERS,
                         params={"query": query, "page": page,
                                 "year": year or ""})
    else:
        sort_map = {"rating": "vote_average.desc",
                    "year":   "primary_release_date.desc",
                    "popularity": "popularity.desc"}
        params = {"page": page,
                  "sort_by": sort_map.get(sort_by, "popularity.desc")}
        if genre_id:
            params["with_genres"] = genre_id
        if year:
            params["primary_release_year"] = year
        r = requests.get(f"{TMDB_BASE}/discover/movie",
                         headers=HEADERS, params=params)
    return [_normalize(m, is_premium=True) for m in r.json().get("results", [])]
