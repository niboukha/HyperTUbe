# movies/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
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

    # Home section request (type= param present)
    if type_ and not q:
        movies = get_home_section(type_=type_, genre_ids=genre_ids, page=page)
        return Response({"results": movies, "page": page, "totalPages": 1})

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

    print(f"Search: q='{q}', genre={genre_ids}, year_from={year_from}, "
          f"year_to={year_to}, min_rating={min_rating}, sort='{sort}', "
          f"page={page} -> {len(result['results'])} results")

    return Response(result)


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_detail(request, movie_id: str):
    """
        /movies/tmdb-550/
        /movies/archive-abc123/
    """
    if movie_id.startswith("archive-"):
        from .adapters.archive import fetch_detail
        data = fetch_detail(movie_id.replace("archive-", ""))
    else:
        from .adapters.tmdb import fetch_detail
        data = fetch_detail(movie_id.replace("tmdb-", ""))

    if not data:
        return Response({"error": "Not found"}, status=404)
    return Response(data)
