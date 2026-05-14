import json
import re
import requests

from django.conf import settings
from ..services.utils import build_response, format_runtime

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
BLOCKED_TITLES = {
    "cosmos: war of the planets"
}
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
    if title.lower() in BLOCKED_TITLES:
        return False
    
    genre_ids = movie.get("genre_ids", [])

    if any(g in BLOCKED_GENRE_IDS for g in genre_ids):
        return False
    return True


def _normalize_list(movie: dict) -> dict:
    """For list/search results — lean, only what cards need."""
    return {
        "id":            f"tmdb-{movie['id']}",
        "type":          "movie",
        "tmdb_id":       movie["id"],
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
        "source":        "tmdb",
        "availability":  "premium",
        "runtime":       format_runtime(movie.get("runtime")),
    }

def _normalize_detail(movie: dict) -> dict:
    """For detail page — full data including genres objects, collection, tagline."""
    return {
        "id":            f"tmdb-{movie['id']}",
        "type":          "movie",
        "tmdb_id":       movie["id"],
        "imdb_id":       movie.get("imdb_id"),
        "source":        "tmdb",
        "availability":  "premium",

        "title":         movie.get("title", ""),
        "original_title": movie.get("original_title", ""),
        "tagline":       movie.get("tagline", ""),
        "overview":      movie.get("overview", ""),
        "year":          (movie.get("release_date") or "")[:4],
        "release_date":  movie.get("release_date"),
        "runtime":       format_runtime(movie.get("runtime")),
        "runtime_mins":  movie.get("runtime"),
        "status":        movie.get("status"),

        "poster_path":   f"https://image.tmdb.org/t/p/original{movie['poster_path']}"
                         if movie.get("poster_path") else None,
        "backdrop_path": f"https://image.tmdb.org/t/p/original{movie['backdrop_path']}"
                         if movie.get("backdrop_path") else None,

        "rating":        round(float(movie.get("vote_average") or 0), 1),
        "vote_count":    movie.get("vote_count", 0),
        "popularity":    movie.get("popularity"),

        "genres":        movie.get("genres", []),          # [{id, name}, ...]
        "genre_ids":     [g["id"] for g in movie.get("genres", [])],

        "collection":    movie.get("belongs_to_collection"),  # {id, name, poster_path, backdrop_path} | null

        "studios":       [c["name"] for c in movie.get("production_companies", [])],
        "countries":     [c["name"] for c in movie.get("production_countries", [])],
        "languages":     [l["english_name"] for l in movie.get("spoken_languages", [])],
        "budget":        movie.get("budget"),
        "revenue":       movie.get("revenue"),

        "homepage":      movie.get("homepage"),
    }


def _filtered_results(results):
    return [
        _normalize_list(movie)
        for movie in results
        if is_quality_movie(movie)
    ]

# def fetch_trending(page=1):
#     r = requests.get(f"{TMDB_BASE}/trending/movie/week",
#                      headers=HEADERS, params={"page": page})
#     body = r.json()
#     # return _filtered_results(body.get("results", [])), body.get("total_pages", 1)
#     return {
#         "results": _filtered_results(body.get("results", [])),
#         "total_pages": body.get("total_pages", 1),
#     }

def fetch_by_type(type_: str, page=1):
    if type_ == "trending":
        r = requests.get(
            f"{TMDB_BASE}/trending/movie/week",
            headers=HEADERS,
            params={"page": page},
        )

    else:
        r = requests.get(
            f"{TMDB_BASE}/movie/{type_}",
            headers=HEADERS,
            params={"page": page},
        )

    body = r.json()
    results = _filtered_results(body.get("results", []))

    return build_response(body, results)

def fetch_by_genre(genre_ids: list, page=1):
    r = requests.get(
        f"{TMDB_BASE}/discover/movie",
        headers=HEADERS,
        params={
            "with_genres": ",".join(str(i) for i in genre_ids),
            "page": page,
            "sort_by": "popularity.desc",
        },
    )
    body = r.json()
    results = _filtered_results(body.get("results", []))

    return build_response(body, results)

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
        
    body = r.json()
    results = _filtered_results(body.get("results", []))

    return build_response(body, results)

def fetch_detail(tmdb_id: int) -> dict:
    r = requests.get(f"{TMDB_BASE}/movie/{tmdb_id}", headers=HEADERS)

    if r.status_code != 200:
        return None
    
    movie = r.json()
    # print(json.dumps(movie, indent=2, ensure_ascii=False))
     
    # print("Fetched TMDB detail for ID", _normalize_detail(movie))
    return _normalize_detail(movie)

def _filtered_results(results):
    return [_normalize_list(m) for m in results if is_quality_movie(m)]


def fetch_collection(collection_id: int) -> dict | None:
    r = requests.get(
        f"{TMDB_BASE}/collection/{collection_id}",
        headers=HEADERS,
    )
    if r.status_code != 200:
        return None
    
    body = r.json()
    parts = [_normalize_list(m) for m in body.get("parts", []) if is_quality_movie(m)]
    
    return {
        "id":           body.get("id"),
        "name":         body.get("name", ""),
        "overview":     body.get("overview", ""),
        "poster_path":  f"https://image.tmdb.org/t/p/original{body['poster_path']}"
                        if body.get("poster_path") else None,
        "backdrop_path": f"https://image.tmdb.org/t/p/original{body['backdrop_path']}"
                         if body.get("backdrop_path") else None,
        "parts":        parts,
    }

def fetch_credits(tmdb_id: int) -> list:
    """Returns top-billed cast for a movie."""
    r = requests.get(f"{TMDB_BASE}/movie/{tmdb_id}/credits", headers=HEADERS)
    if r.status_code != 200:
        return []

    # print(json.dumps(r.json(), indent=2, ensure_ascii=False))


    data = r.json()

    cast = data.get("cast", [])
    crew = data.get("crew", [])

    # print(f"Fetched credits for TMDB ID {tmdb_id}: {[person['name'] for person in cast[:5]]} and more...")

    # print("Full cast:")
    # print(json.dumps(cast[:15], indent=2, ensure_ascii=False))
    # print("Full crew:")
    # print(json.dumps(crew, indent=2, ensure_ascii=False))

    # return [
    #     {
    #         "id":            person["id"],
    #         "name":          person.get("name", ""),
    #         "character":     person.get("character", ""),
    #         "profile_path":  f"https://image.tmdb.org/t/p/w185{person['profile_path']}"
    #                          if person.get("profile_path") else None,
    #         "order":         person.get("order", 99),
    #     }
    #     for person in cast[:15]   # top 15 is plenty
    #     if person.get("known_for_department") == "Acting"
    # ]

    cast_list = [
        {
            "id": person["id"],
            "name": person.get("name", ""),
            "character": person.get("character", ""),
            "profile_path": f"https://image.tmdb.org/t/p/w185{person['profile_path']}"
                if person.get("profile_path") else None,
        }
        for person in cast
        if person.get("known_for_department") == "Acting"
    ]

    # 🎥 Crew filtering
    directors = [c for c in crew if c.get("job") == "Director"]
    producers = [c for c in crew if "Producer" in c.get("job", "")]

    return {
        "cast": cast_list,
        "crew": {
            "directors": directors,
            "producers": producers,
        }
    }
