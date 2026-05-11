# movies/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .services.merger  import get_home_section
from .services.filters import library_search

@api_view(["GET"])
@permission_classes([AllowAny])
def movies_home(request):
    """
    /api/movies?type=trending&genre=28
    /api/movies?type=top
    /api/movies?genre=28
    """
    type_    = request.GET.get("type", "genre")
    genre_id = request.GET.get("genre")
    page     = int(request.GET.get("page", 1))

    genre_id = int(genre_id) if genre_id else None
    movies   = get_home_section(type_, genre_id=genre_id, page=page)

    # Mask premium fields for non-subscribers
    if not (request.user.is_authenticated and request.user.subscription_active):
        movies = _mask_premium(movies)

    return Response({"results": movies, "page": page})


@api_view(["GET"])
@permission_classes([AllowAny])
def library(request):
    """
    /api/library?q=batman&genre=28&year=1989&sort=rating&page=2
    Infinite scroll — just increment page on the frontend.
    """
    result = library_search(
        query    = request.GET.get("q", ""),
        genre_id = int(g) if (g := request.GET.get("genre")) else None,
        year     = request.GET.get("year"),
        sort_by  = request.GET.get("sort", "popularity"),
        source   = request.GET.get("source", "all"),
        page     = int(request.GET.get("page", 1)),
    )

    if not (request.user.is_authenticated and request.user.subscription_active):
        result["results"] = _mask_premium(result["results"])

    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stream(request, movie_id: str):
    """
    /api/movies/tmdb-550/stream/   → requires subscription
    /api/movies/archive-abc123/stream/ → free
    """
    if movie_id.startswith("archive-"):
        archive_id = movie_id.replace("archive-", "")
        return Response({"url": f"https://archive.org/details/{archive_id}"})

    # TMDB movie → check subscription
    if not request.user.subscription_active:
        return Response({"error": "Premium required"}, status=403)

    # Return your actual stream URL here (e.g. from your video host)
    return Response({"url": f"https://yourhost.com/stream/{movie_id}"})


def _mask_premium(movies):
    """Show premium movies in listings but block the stream URL."""
    return [
        {**m, "watch_url": None, "is_locked": True}
        if m["is_premium"] else m
        for m in movies
    ]