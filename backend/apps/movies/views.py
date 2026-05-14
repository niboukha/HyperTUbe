# movies/views.py
from ctypes import cast
import json

import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .services.utils import _shuffle_merge

from .adapters.tmdb import HEADERS, TMDB_BASE, fetch_credits
from .services.merger  import get_home_section
from .services.filters import library_search

SORT_MAP = {
    "popular": "popularity",
    "rating":  "vote_average",
    "newest":  "primary_release_date_desc",
    "oldest":  "primary_release_date_asc",
}

GENRE_NAME_TO_ID = {
    "Action": 28,
    "Adventure": 12,
    "Animation": 16,
    "Comedy": 35,
    "Crime": 80,
    "Documentary": 99,
    "Drama": 18,
    "Family": 10751,
    "Fantasy": 14,
    "History": 36,
    "Horror": 27,
    "Music": 10402,
    "Mystery": 9648,
    "Romance": 10749,
    "Science Fiction": 878,
    "TV Movie": 10770,
    "Thriller": 53,
    "War": 10752,
    "Western": 37,
}

@api_view(["GET"])
@permission_classes([AllowAny])
def movies_list(request):
    """
    Handles both home sections and library search from one endpoint.

    Home sections:
      /movies?type=trending
      /movies?type=top
      /movies?genre=28

    Library (from useLibraryMovies hook):
      /movies?q=batman
      /movies?genre=28&sort=rating&yearFrom=2000&yearTo=2020&minRating=7
      /movies?page=2&genre=16
    """
    
    q          = request.GET.get("q", "").strip()
    type_      = request.GET.get("type")
    genre      = request.GET.get("genre")
    sort       = request.GET.get("sort", "popular")
    min_rating = float(request.GET.get("minRating", 0))
    year_from  = request.GET.get("yearFrom")
    year_to    = request.GET.get("yearTo")
    page       = int(request.GET.get("page", 1))
    
    genre_ids = []
    if genre:
        genre_list = [g.strip() for g in genre.split(",")]

        for g in genre_list:
            if g.isdigit():
                genre_ids.append(int(g))
            else:
                genre_id = GENRE_NAME_TO_ID.get(g)
                if genre_id:
                    genre_ids.append(genre_id)

    # print("---------------------------> , ", type_, genre_ids, sort, min_rating, year_from, year_to, page)

    # Home section request (type= param present)
    if type_ and not q:
        movies = get_home_section(type_=type_, genre_ids=genre_ids, page=page)
        return Response(movies)

    # Library / filtered search
    result = library_search(
        query      = q,
        genre_ids  = genre_ids,
        year_from  = int(year_from) if year_from else None,
        year_to    = int(year_to)   if year_to   else None,
        min_rating = min_rating,
        sort_by    = SORT_MAP.get(sort, "popularity"),
        page       = page,
    )

    return Response(result)


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_detail(request, movie_id: str):
    """
    /api/movies/tmdb-1266127/
    /api/movies/archive-AtlanticFlight/
    """
    if movie_id.startswith("archive-"):
        from .adapters.archive import fetch_detail
        data = fetch_detail(movie_id.removeprefix("archive-"))
    elif movie_id.startswith("tmdb-"):
        from .adapters.tmdb import fetch_detail
        tmdb_id = movie_id.removeprefix("tmdb-")
        data = fetch_detail(int(tmdb_id))
        if data:
            # attach cast directly on the detail response
            # print(f"Fetching credits for TMDB ID {tmdb_id}...")
            # print(json.dumps(data, indent=2, ensure_ascii=False))
            credits = fetch_credits(tmdb_id)
            if credits:
                data["cast"] = credits["cast"]
                data["crew"] = credits["crew"]
    else:
        return Response({"error": "Invalid id format"}, status=400)

    if not data:
        return Response({"error": "Not found"}, status=404)
    # print("Fetched movie detail:")
    # print(json.dumps(data, indent=2, ensure_ascii=False))
    
    return Response(data)


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_trailer(request, movie_id: str):
    """
    /api/movies/tmdb-122/trailer/
    Returns {"url": "https://youtube.com/embed/..."} or {"url": null}
    """
    if not movie_id.startswith("tmdb-"):
        return Response({"url": None})

    tmdb_id = movie_id.removeprefix("tmdb-")
    r = requests.get(
        f"{TMDB_BASE}/movie/{tmdb_id}/videos",
        headers=HEADERS,
    )
    videos   = r.json().get("results", [])
    trailers = [v for v in videos if v["type"] == "Trailer" and v["site"] == "YouTube"]

    if not trailers:
        return Response({"url": None})

    key = trailers[0]["key"]
    return Response({"url": f"https://www.youtube.com/embed/{key}?autoplay=1&rel=0"})


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_collection(request, collection_id: int):
    """
    /api/movies/collection/119/
    Returns collection metadata + all parts normalized.
    Only TMDB has collections — archive returns 404.
    """
    from .adapters.tmdb import fetch_collection
    data = fetch_collection(collection_id)
    if not data:
        return Response({"error": "Collection not found"}, status=404)
    return Response(data)

@api_view(["GET"])
@permission_classes([AllowAny])
def movie_search(request):
    """
    /api/search/?q=harry+potter
    /api/search/?q=batman&page=2
    Used by the search bar dropdown — fast, TMDB only, no archive.
    """
    q    = request.GET.get("q", "").strip()
    page = int(request.GET.get("page", 1))

    if not q:
        return Response({"results": [], "totalPages": 0, "page": 1})

    from .adapters.tmdb import search
    tmdb_data = search(query=q, page=page)
    
    from .adapters.archive import fetch_movies
    archive_data = fetch_movies(search=q, page=page)

    tmdb_results = tmdb_data.get("results", [])
    archive_results = archive_data.get("results", [])

    merged = _shuffle_merge(tmdb_results, archive_results)
    # print(json.dumps(merged, indent=2, ensure_ascii=False))

    return Response(merged)
