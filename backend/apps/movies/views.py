# movies/views.py
import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from concurrent.futures import ThreadPoolExecutor

from .adapters.tmdb   import HEADERS, TMDB_BASE, fetch_credits
from .services.merger import get_home_section
from .services.filters import library_search
from .services.utils  import _shuffle_merge

SORT_MAP = {
    "popular": "popularity",
    "rating":  "vote_average",
    "newest":  "primary_release_date_desc",
    "oldest":  "primary_release_date_asc",
}

GENRE_NAME_TO_ID = {
    "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35,
    "Crime": 80, "Documentary": 99, "Drama": 18, "Family": 10751,
    "Fantasy": 14, "History": 36, "Horror": 27, "Music": 10402,
    "Mystery": 9648, "Romance": 10749, "Science Fiction": 878,
    "TV Movie": 10770, "Thriller": 53, "War": 10752, "Western": 37,
}


def _parse_genre_ids(genre_param: str) -> list[int]:
    """Accept comma-separated genre ids or names."""
    ids = []
    for g in [g.strip() for g in genre_param.split(",")]:
        if g.isdigit():
            ids.append(int(g))
        elif (gid := GENRE_NAME_TO_ID.get(g)):
            ids.append(gid)
    return ids


# Endpoints -------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def movies_list(request):
    try:
        q          = request.GET.get("q", "").strip()
        type_      = request.GET.get("type", "").strip()
        genre      = request.GET.get("genre", "")
        sort       = request.GET.get("sort", "popular")
        min_rating = float(request.GET.get("minRating", 0) or 0)
        year_from  = request.GET.get("yearFrom")
        year_to    = request.GET.get("yearTo")
        page       = max(1, int(request.GET.get("page", 1) or 1))
        genre_ids  = _parse_genre_ids(genre) if genre else []

        if type_ and not q:
            return Response(get_home_section(type_=type_, genre_ids=genre_ids, page=page))

        return Response(library_search(
            query      = q,
            genre_ids  = genre_ids,
            year_from  = int(year_from) if year_from else None,
            year_to    = int(year_to)   if year_to   else None,
            min_rating = min_rating,
            sort_by    = SORT_MAP.get(sort, "popularity"),
            page       = page,
        ))

    except Exception as e:
        import traceback
        traceback.print_exc()   # prints full trace to Django console
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@api_view(["GET"])
@permission_classes([AllowAny])
def movie_detail(request, movie_id: str):
    if movie_id.startswith("archive-"):
        from .adapters.archive import fetch_detail
        archive_id = movie_id.removeprefix("archive-")
        data = fetch_detail(archive_id)
    elif movie_id.startswith("tmdb-"):
        from .adapters.tmdb import fetch_detail, fetch_credits
        tmdb_id = movie_id.removeprefix("tmdb-")
        data    = fetch_detail(tmdb_id)
        if data:
            credits      = fetch_credits(tmdb_id)
            data["cast"] = credits["cast"]
            data["crew"] = credits["crew"]
    else:
        return Response({"error": "Invalid id"}, status=status.HTTP_400_BAD_REQUEST)

    if not data:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(data)


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_trailer(request, movie_id: str):
    """
    /api/movies/tmdb-122/trailer/
    Archive movies have no trailers — returns {"url": null}.
    """
    if not movie_id.startswith("tmdb-"):
        return Response({"url": None})

    tmdb_id  = movie_id.removeprefix("tmdb-")
    r        = requests.get(f"{TMDB_BASE}/movie/{tmdb_id}/videos", headers=HEADERS)
    trailers = [v for v in r.json().get("results", [])
                if v["type"] == "Trailer" and v["site"] == "YouTube"]

    if not trailers:
        return Response({"url": None}, status=status.HTTP_404_NOT_FOUND)

    return Response({"url": f"https://www.youtube.com/embed/{trailers[0]['key']}?autoplay=1&rel=0"})


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_collection(request, collection_id: int):
    """
    /api/movies/collection/119/
    TMDB-only — archive has no collection concept.
    """
    from .adapters.tmdb import fetch_collection
    data = fetch_collection(collection_id)
    if not data:
        return Response({"error": "Collection not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(data)


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_search(request):
    """
    /api/search/?q=harry+potter
    Fast search used by the navbar dropdown — merges TMDB + archive.
    """
    q    = request.GET.get("q", "").strip()
    page = max(1, int(request.GET.get("page", 1) or 1))

    if not q:
        return Response({"results": [], "totalPages": 0, "page": 1})

    from .adapters.tmdb    import search as tmdb_search
    from .adapters.archive import fetch_movies as archive_search

    with ThreadPoolExecutor(max_workers=2) as pool:
        tf = pool.submit(tmdb_search,    query=q, page=page)
        af = pool.submit(archive_search, search=q, page=page)
        tmdb_data, archive_data = tf.result(), af.result()

    merged = _shuffle_merge(tmdb_data.get("results", []),
                            archive_data.get("results", []))
    return Response({
        "results":    merged,
        "page":       page,
        "totalPages": max(tmdb_data.get("total_pages", 1),
                          archive_data.get("total_pages", 1)),
    })

@api_view(["GET"])
@permission_classes([AllowAny])
def movies_runtime_batch(request):
    """
    /api/movies/runtime/?ids=tmdb-550,tmdb-122,tmdb-680
    Returns {id: runtime} map. Archive movies return "N/A".
    Fetches all runtimes in parallel — one request per TMDB id.
    """
    raw_ids = request.GET.get("ids", "").strip()
    if not raw_ids:
        return Response({}, status=status.HTTP_400_BAD_REQUEST)

    movie_ids = [i.strip() for i in raw_ids.split(",") if i.strip()]

    def fetch_runtime(movie_id: str) -> tuple[str, str]:
        if movie_id.startswith("archive-"):
            # Archive metadata has runtime as a string field
            from .adapters.archive import fetch_runtime as archive_runtime
            return movie_id, archive_runtime(movie_id.removeprefix("archive-"))

        if movie_id.startswith("tmdb-"):
            from .adapters.tmdb import fetch_runtime as tmdb_runtime
            return movie_id, tmdb_runtime(int(movie_id.removeprefix("tmdb-")))

        return movie_id, "N/A"

    with ThreadPoolExecutor(max_workers=min(len(movie_ids), 10)) as pool:
        results = dict(pool.map(fetch_runtime, movie_ids))

    return Response(results)