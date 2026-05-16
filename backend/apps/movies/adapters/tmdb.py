import re
import logging

from django.conf import settings
from ..client import safe_get
from ..services.utils import build_response, format_runtime

logger    = logging.getLogger(__name__)
TMDB_BASE = "https://api.themoviedb.org/3"
HEADERS   = {"Authorization": f"Bearer {settings.TMDB_TOKEN}"}

BLOCKED_GENRE_IDS = {10749, 18, 53, 99}
BLOCKED_TITLES    = {"cosmos: war of the planets"}
ADULT_KEYWORDS = re.compile(
    r"\b(xxx|porn|erotic|eroti[ck]|sex|adult|nude|naked|hentai|softcore|hardcore)\b",
    re.IGNORECASE,
)
MIN_VOTE_COUNT    = 10

# Quality gate ----------------------------------------------------------------------------------------
def is_quality_movie(movie: dict) -> bool:
    title = movie.get("title") or movie.get("name") or ""
    if movie.get("adult"):                                                   return False
    if not title:                                                            return False
    if ADULT_KEYWORDS.search(title):                                         return False
    if title.lower() in BLOCKED_TITLES:                                      return False
    genre_ids = movie.get("genre_ids") or []
    if genre_ids and any(g in BLOCKED_GENRE_IDS for g in genre_ids):        return False
    if movie.get("vote_count", 0) < MIN_VOTE_COUNT:                         return False
    return True

# Normalizers ----------------------------------------------------------------------------------------

def _normalize_list(movie: dict) -> dict:
    return {
        "id":            f"tmdb-{movie['id']}",
        "type":          "movie",
        "tmdb_id":       movie["id"],
        "source":        "tmdb",
        "availability":  "premium",
        "title":         movie.get("title") or "Unavailable",
        "overview":      movie.get("overview") or "",
        "year":          (movie.get("release_date") or "")[:4],
        "rating":        round(float(movie.get("vote_average") or 0), 1),
        "vote_count":    movie.get("vote_count") or 0,
        "genre_ids":     movie.get("genre_ids") or [],
        "poster_path":   f"https://image.tmdb.org/t/p/original{movie['poster_path']}"
                         if movie.get("poster_path") else None,
        "backdrop_path": f"https://image.tmdb.org/t/p/original{movie['backdrop_path']}"
                         if movie.get("backdrop_path") else None,
        "runtime":       format_runtime(movie.get("runtime")),
    }

def _normalize_detail(movie: dict) -> dict:
    return {
        "id":             f"tmdb-{movie['id']}",
        "type":           "movie",
        "tmdb_id":        movie["id"],
        "imdb_id":        movie.get("imdb_id"),
        "source":         "tmdb",
        "availability":   "premium",
        "title":          movie.get("title") or "Unavailable",
        "original_title": movie.get("original_title") or "",
        "tagline":        movie.get("tagline") or "",
        "overview":       movie.get("overview") or "",
        "year":           (movie.get("release_date") or "")[:4],
        "release_date":   movie.get("release_date"),
        "runtime":        format_runtime(movie.get("runtime")),
        "poster_path":    f"https://image.tmdb.org/t/p/original{movie['poster_path']}"
                          if movie.get("poster_path") else None,
        "backdrop_path":  f"https://image.tmdb.org/t/p/original{movie['backdrop_path']}"
                          if movie.get("backdrop_path") else None,
        "rating":         round(float(movie.get("vote_average") or 0), 1),
        "vote_count":     movie.get("vote_count") or 0,
        "popularity":     movie.get("popularity") or 0,
        "genres":         movie.get("genres") or [],
        "genre_ids":      [g["id"] for g in movie.get("genres") or []],
        "collection":     movie.get("belongs_to_collection"),
        "languages":      [l["english_name"] for l in movie.get("spoken_languages") or []],
    }

def _filtered(results: list) -> list:
    return [_normalize_list(m) for m in (results or []) if is_quality_movie(m)]

# Fetch helpers ----------------------------------------------------------------------------------------

def fetch_by_type(type_: str, page: int = 1) -> dict:
    url  = (f"{TMDB_BASE}/trending/movie/week"
            if type_ == "trending" else f"{TMDB_BASE}/movie/{type_}")
    body = safe_get(url, params={"page": page}, headers=HEADERS, fallback={})
    return build_response(body, _filtered(body.get("results")))

def fetch_by_genre(genre_ids: list, page: int = 1) -> dict:
    body = safe_get(
        f"{TMDB_BASE}/discover/movie", headers=HEADERS,
        params={"with_genres": ",".join(str(i) for i in genre_ids),
                "page": page, "sort_by": "popularity.desc"},
        fallback={},
    )
    return build_response(body, _filtered(body.get("results")))

def search(query: str = "", genre_ids: list = None, year_from: int = None,
           year_to: int = None, sort_by: str = "popularity", page: int = 1) -> dict:
    if query:
        body = safe_get(
            f"{TMDB_BASE}/search/movie", headers=HEADERS,
            params={"query": query, "page": page, "include_adult": False},
            fallback={},
        )
    else:
        sort_map = {
            "rating":                    "vote_average.desc",
            "primary_release_date_desc": "primary_release_date.desc",
            "primary_release_date_asc":  "primary_release_date.asc",
            "popularity":                "popularity.desc",
        }
        params = {"page": page, "include_adult": False,
                  "sort_by": sort_map.get(sort_by, "popularity.desc"),
                  "vote_count.gte": MIN_VOTE_COUNT}
        if genre_ids: params["with_genres"] = ",".join(str(i) for i in genre_ids)
        if year_from: params["primary_release_date.gte"] = f"{year_from}-01-01"
        if year_to:   params["primary_release_date.lte"] = f"{year_to}-12-31"
        body = safe_get(f"{TMDB_BASE}/discover/movie", headers=HEADERS,
                        params=params, fallback={})

    return build_response(body, _filtered(body.get("results")))

def fetch_detail(tmdb_id: int) -> dict | None:
    body = safe_get(f"{TMDB_BASE}/movie/{tmdb_id}", headers=HEADERS, fallback=None)
    return _normalize_detail(body) if body and body.get("id") else None

def fetch_credits(tmdb_id: int) -> dict:
    body = safe_get(f"{TMDB_BASE}/movie/{tmdb_id}/credits",
                    headers=HEADERS, fallback={})
    cast = [
        {"id": p["id"], "name": p.get("name", ""), "character": p.get("character", ""),
         "profile_path": f"https://image.tmdb.org/t/p/w185{p['profile_path']}"
                         if p.get("profile_path") else None}
        for p in (body.get("cast") or [])[:15]
        if p.get("known_for_department") == "Acting"
    ]
    crew = body.get("crew") or []
    return {
        "cast": cast,
        "crew": {
            "directors": [c for c in crew if c.get("job") == "Director"],
            "producers": [c for c in crew if "Producer" in c.get("job", "")],
        },
    }

def fetch_collection(collection_id: int) -> dict | None:
    body = safe_get(f"{TMDB_BASE}/collection/{collection_id}",
                    headers=HEADERS, fallback=None)
    if not body:
        return None
    return {
        "id":            body.get("id"),
        "name":          body.get("name", ""),
        "overview":      body.get("overview", ""),
        "poster_path":   f"https://image.tmdb.org/t/p/original{body['poster_path']}"
                         if body.get("poster_path") else None,
        "backdrop_path": f"https://image.tmdb.org/t/p/original{body['backdrop_path']}"
                         if body.get("backdrop_path") else None,
        "parts":         [_normalize_list(m) for m in (body.get("parts") or [])
                          if is_quality_movie(m)],
    }

def fetch_runtime(tmdb_id: int) -> str:
    from ..cache.movie_cache import get_tmdb_runtime, set_tmdb_runtime
    cached = get_tmdb_runtime(tmdb_id)
    if cached is not None:
        return cached
    body    = safe_get(f"{TMDB_BASE}/movie/{tmdb_id}", headers=HEADERS, fallback={})
    runtime = format_runtime((body or {}).get("runtime"))
    set_tmdb_runtime(tmdb_id, runtime)
    return runtime
