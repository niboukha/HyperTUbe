import logging
from concurrent.futures import ThreadPoolExecutor

import requests
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .adapters.tmdb import HEADERS, TMDB_BASE
from .services.merger import get_home_section
from .services.filters import library_search

logger = logging.getLogger(__name__)

SORT_MAP = {
    "popular": "popularity",
    "rating":  "vote_average",
    "newest":  "primary_release_date_desc",
    "oldest":  "primary_release_date_asc",
    "name":    "name",
}

GENRE_NAME_TO_ID = {
    "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35,
    "Crime": 80, "Documentary": 99, "Drama": 18, "Family": 10751,
    "Fantasy": 14, "History": 36, "Horror": 27, "Music": 10402,
    "Mystery": 9648, "Romance": 10749, "Science Fiction": 878,
    "TV Movie": 10770, "Thriller": 53, "War": 10752, "Western": 37,
}

def _parse_genre_ids(genre_param: str) -> list[int]:
    """'28,Action,878' → [28, 878]"""
    ids = []
    for g in (genre_param or "").split(","):
        g = g.strip()
        if not g:
            continue
        if g.isdigit():
            ids.append(int(g))
        elif g in GENRE_NAME_TO_ID:
            ids.append(GENRE_NAME_TO_ID[g])
    return ids


def _movies_list_response(request):
    try:
        q          = request.GET.get("q", "").strip()
        type_      = request.GET.get("type", "").strip() or None
        genre      = request.GET.get("genre", "").strip()
        sort       = request.GET.get("sort") or ("name" if q else "popular")
        year_from  = request.GET.get("yearFrom")
        year_to    = request.GET.get("yearTo")
        page_raw   = request.GET.get("page", "1")
        min_rating = request.GET.get("minRating", "0")

        # validate numeric params
        try:
            page = max(1, int(page_raw))
        except ValueError:
            return Response(
                {"error": "page must be a positive integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            min_rating = float(min_rating)
        except ValueError:
            return Response(
                {"error": "minRating must be a number"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if year_from is not None:
            try:
                year_from = int(year_from)
            except ValueError:
                return Response(
                    {"error": "yearFrom must be a year number"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if year_to is not None:
            try:
                year_to = int(year_to)
            except ValueError:
                return Response(
                    {"error": "yearTo must be a year number"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        genre_ids = _parse_genre_ids(genre)

        #  home section
        if type_ and not q:
            data = get_home_section(type_=type_, genre_ids=genre_ids, page=page)
            return Response(data, status=status.HTTP_200_OK)

        # library / search
        data = library_search(
            query      = q,
            genre_ids  = genre_ids,
            year_from  = year_from,
            year_to    = year_to,
            min_rating = min_rating,
            sort_by    = SORT_MAP.get(sort, "name"),
            page       = page,
        )
        return Response(data, status=status.HTTP_200_OK)

    except Exception as exc:
        logger.exception("movies_list failed: %s", exc)
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def movies_list(request):
    """
    Home sections:   /movies?type=trending
                     /movies?type=genre&genre=28
    Library search:  /movies?q=batman
                     /movies?genre=28&sort=rating&yearFrom=2000&yearTo=2020
    """
    return _movies_list_response(request)


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_detail(request, movie_id: str):
    """
    /api/movies/tmdb-1266127/
    /api/movies/archive-AtlanticFlight/
    """
    try:
        if movie_id.startswith("archive-"):
            from .adapters.archive import fetch_detail
            data = fetch_detail(movie_id.removeprefix("archive-"))

        elif movie_id.startswith("tmdb-"):
            from .adapters.tmdb import fetch_detail
            raw = movie_id.removeprefix("tmdb-")
            if not raw.isdigit():
                return Response(
                    {"error": "Invalid TMDB id"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            data = fetch_detail(int(raw))

        else:
            return Response(
                {"error": "id must start with 'tmdb-' or 'archive-'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if data is None:
            return Response({"error": "Movie not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(data, status=status.HTTP_200_OK)

    except Exception as exc:
        logger.exception("movie_detail failed for %s: %s", movie_id, exc)
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_trailer(request, movie_id: str):
    """
    /api/movies/tmdb-122/trailer/
    Returns {"url": "https://youtube.com/embed/..."} or {"url": null}
    Archive movies never have trailers.
    """
    if not movie_id.startswith("tmdb-"):
        return Response({"url": None}, status=status.HTTP_200_OK)

    raw = movie_id.removeprefix("tmdb-")
    if not raw.isdigit():
        return Response(
            {"error": "Invalid TMDB id"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        r      = requests.get(f"{TMDB_BASE}/movie/{raw}/videos", headers=HEADERS, timeout=5)
        videos = r.json().get("results", [])
    except Exception as exc:
        logger.warning("trailer fetch failed for %s: %s", movie_id, exc)
        return Response({"url": None}, status=status.HTTP_200_OK)

    trailers = [v for v in videos if v["type"] == "Trailer" and v["site"] == "YouTube"]
    if not trailers:
        return Response({"url": None}, status=status.HTTP_200_OK)

    key = trailers[0]["key"]
    return Response(
        {"url": f"https://www.youtube.com/embed/{key}?autoplay=1&rel=0"},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_collection(request, collection_id: int):
    """
    /api/movies/collection/119/
    """
    try:
        from .adapters.tmdb import fetch_collection
        data = fetch_collection(collection_id)
        if not data:
            return Response(
                {"error": "Collection not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(data, status=status.HTTP_200_OK)

    except Exception as exc:
        logger.exception("movie_collection failed for %s: %s", collection_id, exc)
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def movies_runtime_batch(request):
    """
    /api/movies/runtime/?ids=tmdb-122,archive-Foo
    """
    raw_ids = request.GET.get("ids", "").strip()
    if not raw_ids:
        return Response(
            {"error": "ids query param is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    movie_ids = [i.strip() for i in raw_ids.split(",") if i.strip()]
    if len(movie_ids) > 50:
        return Response(
            {"error": "Maximum 50 ids per request"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def get_runtime(movie_id: str) -> tuple[str, str]:
        from .cache.movie_cache import get_runtime as cache_get, set_runtime
        cached = cache_get(movie_id)
        if cached:
            return movie_id, cached
        try:
            if movie_id.startswith("archive-"):
                from .adapters.archive import fetch_detail
                detail = fetch_detail(movie_id.removeprefix("archive-"))
                rt = (detail or {}).get("runtime", "N/A")
            elif movie_id.startswith("tmdb-"):
                from .adapters.tmdb import fetch_runtime as tr
                rt = tr(int(movie_id.removeprefix("tmdb-")))
            else:
                rt = "N/A"
            set_runtime(movie_id, rt)
            return movie_id, rt
        except Exception as exc:
            logger.warning("runtime fetch failed %s: %s", movie_id, exc)
            return movie_id, "N/A"

    with ThreadPoolExecutor(max_workers=min(len(movie_ids), 10)) as pool:
        results = dict(pool.map(get_runtime, movie_ids))

    return Response(results, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_search(request):
    """
    /api/search/?q=batman  (alias kept for url conf)
    """
    return _movies_list_response(request)
