import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FT

from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .adapters.tmdb   import HEADERS, TMDB_BASE
from .client          import safe_get
from .services.merger import get_home_section
from .services.filters import library_search

logger = logging.getLogger(__name__)

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
    "Thriller": 53, "War": 10752, "Western": 37,
}


def _parse_genre_ids(genre_param: str) -> list[int]:
    ids = []
    for g in [g.strip() for g in genre_param.split(",")]:
        if g.isdigit():             ids.append(int(g))
        elif g in GENRE_NAME_TO_ID: ids.append(GENRE_NAME_TO_ID[g])
    return ids

def _parse_request(request) -> dict:
    """Extract and parse all common query parameters."""
    genre   = request.GET.get("genre", "")
    return {
        "q":          request.GET.get("q", "").strip(),
        "type_":      request.GET.get("type", "").strip(),
        "genre_ids":  _parse_genre_ids(genre) if genre else [],
        "sort":       request.GET.get("sort", "popular"),
        "min_rating": float(request.GET.get("minRating", 0) or 0),
        "year_from":  request.GET.get("yearFrom"),
        "year_to":    request.GET.get("yearTo"),
        "page":       max(1, int(request.GET.get("page", 1) or 1)),
    }

def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# Endpoints ------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def movies_list(request):
    """
    /movies/ home sections and scroll pages 2+
    Home:    ?type=trending | ?type=top_rated | ?genre=28
    Library: ?q=batman | ?genre=28&sort=rating&yearFrom=2000
    """
    p = _parse_request(request)
    if p["type_"] and not p["q"]:
        return Response(get_home_section(
            type_=p["type_"], genre_ids=p["genre_ids"], page=p["page"]
        ))
    return Response(library_search(
        query=p["q"], genre_ids=p["genre_ids"],
        year_from=int(p["year_from"]) if p["year_from"] else None,
        year_to=int(p["year_to"])     if p["year_to"]   else None,
        min_rating=p["min_rating"],
        sort_by=SORT_MAP.get(p["sort"], "popularity"),
        page=p["page"],
    ))


# @api_view(["GET"])
# @permission_classes([AllowAny])
def library_search_stream(request):
    """
    /movies/stream/ SSE endpoint for library page 1
    
    Flow:
    1. Send TMDB results immediately (~300ms)
    2. Check archive cache:
       - HIT  → send archive event immediately
       - MISS → queue Celery, poll Redis for up to 8s, send when ready
    3. Send done event, close connection
    
    Frontend listens to 3 events: tmdb, archive, done
    """
    p         = _parse_request(request)
    genre_ids = p["genre_ids"]
    sort_by   = SORT_MAP.get(p["sort"], "popularity")
    year_from = int(p["year_from"]) if p["year_from"] else None
    year_to   = int(p["year_to"])   if p["year_to"]   else None
    min_rating = p["min_rating"]
    q          = p["q"]
    page       = p["page"]

    def event_stream():
        from .cache.movie_cache import get_archive_search
        from .adapters import tmdb as tmdb_adapter
        from .tasks import search_archive_task

        genre_key = ",".join(str(g) for g in sorted(genre_ids))

        # Event 1: TMDB send immediately
        try:
            tmdb_data    = tmdb_adapter.search(query=q, genre_ids=genre_ids,
                                                year_from=year_from, year_to=year_to,
                                                sort_by=sort_by, page=page)
            tmdb_results = tmdb_data.get("results", [])
            if min_rating > 0:
                tmdb_results = [m for m in tmdb_results
                                if float(m.get("rating") or 0) >= min_rating]
            yield _sse("tmdb", {
                "results":    tmdb_results,
                "page":       page,
                "totalPages": tmdb_data.get("total_pages", 1),
            })
        except Exception as e:
            logger.error("SSE TMDB failed: %s", e)
            yield _sse("tmdb", {"results": [], "page": page, "totalPages": 1})

        # Event 2: Archive from cache or wait for Celery
        # Don't queue for very short queries
        if q and len(q.strip()) < 2:
            yield _sse("archive", {"results": [], "skipped": True})
        else:
            archive_cached = get_archive_search(q, genre_key, 1)

            if archive_cached is not None:
                archive_results = archive_cached.get("results", [])
                if min_rating > 0:
                    archive_results = [m for m in archive_results
                                       if float(m.get("rating") or 0) >= min_rating]
                yield _sse("archive", {"results": archive_results, "cached": True})
            else:
                # Queue Celery and poll until cache is filled or timeout
                try:
                    search_archive_task.delay(q, 1, genre_ids)
                except Exception as e:
                    logger.warning("SSE: failed to queue archive task: %s", e)

                deadline = time.time() + 8.0
                sent     = False
                while time.time() < deadline:
                    time.sleep(0.5)
                    filled = get_archive_search(q, genre_key, 1)
                    if filled is not None:
                        archive_results = filled.get("results", [])
                        if min_rating > 0:
                            archive_results = [m for m in archive_results
                                               if float(m.get("rating") or 0) >= min_rating]
                        yield _sse("archive", {"results": archive_results, "cached": False})
                        sent = True
                        break

                if not sent:
                    yield _sse("archive", {"results": [], "timeout": True})

        # Event 3: Done frontend closes EventSource
        yield _sse("done", {})

    response = StreamingHttpResponse(
        streaming_content=event_stream(),
        content_type="text/event-stream; charset=utf-8",
    )
    response["Cache-Control"]               = "no-cache"
    response["X-Accel-Buffering"]           = "no"
    response["Access-Control-Allow-Origin"] = "*"
    return response


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_search(request):
    """
    /search/ navbar dropdown search (TMDB only, archive from cache)
    TMDB is always live. Archive only included if already cached zero latency penalty.
    """
    q    = request.GET.get("q", "").strip()
    page = max(1, int(request.GET.get("page", 1) or 1))

    if not q:
        return Response({"results": [], "totalPages": 0, "page": 1})

    from .cache.movie_cache import get_search_results, set_search_results, get_archive_search
    from .services.utils import _shuffle_merge
    from .adapters.tmdb import search as tmdb_search

    nav_key = f"{q.lower().strip()}:p{page}"
    cached  = get_search_results(nav_key, source="navbar")
    if cached:
        return Response(cached)

    tmdb_data       = tmdb_search(query=q, page=page)
    archive_cached  = get_archive_search(q, "", 1)
    archive_results = (archive_cached or {}).get("results", [])

    # Queue archive for next request — fire and forget
    if archive_cached is None and len(q.strip()) >= 2:
        try:
            from .tasks import search_archive_task
            search_archive_task.delay(q, 1, [])
        except Exception:
            pass

    merged = tmdb_data.get("results", []) + archive_results
    result = {
        "results":    merged,
        "page":       page,
        "totalPages": tmdb_data.get("total_pages", 1),
    }

    if archive_results:
        set_search_results(nav_key, result, source="navbar")
    return Response(result)


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_detail(request, movie_id: str):
    if movie_id.startswith("archive-"):
        from .adapters.archive import fetch_detail
        data = fetch_detail(movie_id.removeprefix("archive-"))
        if data is None:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        http_status = status.HTTP_202_ACCEPTED if data.get("_pending") else status.HTTP_200_OK

       
        return Response(data, status=http_status)

    elif movie_id.startswith("tmdb-"):
        from .adapters.tmdb import fetch_detail, fetch_credits
        tmdb_id = int(movie_id.removeprefix("tmdb-"))
        data    = fetch_detail(tmdb_id)
        if not data:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        credits      = fetch_credits(tmdb_id)
        data["cast"] = credits["cast"]
        data["crew"] = credits["crew"]
        return Response(data)

    return Response({"error": "Invalid id"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_trailer(request, movie_id: str):
    if not movie_id.startswith("tmdb-"):
        return Response({"url": None})
    tmdb_id  = movie_id.removeprefix("tmdb-")
    body     = safe_get(f"{TMDB_BASE}/movie/{tmdb_id}/videos", headers=HEADERS, fallback={})
    trailers = [v for v in (body or {}).get("results", [])
                if v["type"] == "Trailer" and v["site"] == "YouTube"]
    if not trailers:
        return Response({"url": None}, status=status.HTTP_404_NOT_FOUND)
    return Response({"url": f"https://www.youtube.com/embed/{trailers[0]['key']}?autoplay=1&rel=0"})


@api_view(["GET"])
@permission_classes([AllowAny])
def movie_collection(request, collection_id: int):
    from .adapters.tmdb import fetch_collection
    data = fetch_collection(collection_id)
    if not data:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(data)


@api_view(["GET"])
@permission_classes([AllowAny])
def movies_runtime_batch(request):
    """
    /movies/runtime/?ids=tmdb-550,archive-batman
    Parallel runtime fetch all from cache where possible.
    """
    raw_ids = request.GET.get("ids", "").strip()
    if not raw_ids:
        return Response({}, status=status.HTTP_400_BAD_REQUEST)

    movie_ids = [i.strip() for i in raw_ids.split(",") if i.strip()]

    def get_runtime(movie_id: str) -> tuple[str, str]:
        try:
            if movie_id.startswith("archive-"):
                from .adapters.archive import fetch_runtime
                return movie_id, fetch_runtime(movie_id.removeprefix("archive-"))
            if movie_id.startswith("tmdb-"):
                from .adapters.tmdb import fetch_runtime
                return movie_id, fetch_runtime(int(movie_id.removeprefix("tmdb-")))
        except Exception as e:
            logger.warning("runtime fetch failed %s: %s", movie_id, e)
        return movie_id, "N/A"

    with ThreadPoolExecutor(max_workers=min(len(movie_ids), 10)) as pool:
        results = dict(pool.map(get_runtime, movie_ids))

    return Response(results)














# import logging
# from concurrent.futures import ThreadPoolExecutor, TimeoutError as FT
# import json
# import time
# from django.http import StreamingHttpResponse
# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.permissions import AllowAny
# from rest_framework.response import Response
# from rest_framework import status

# from .adapters.tmdb    import BLOCKED_GENRE_IDS, HEADERS, TMDB_BASE, fetch_credits
# from .client           import safe_get
# from .services.merger  import get_home_section
# from .services.filters import library_search
# from .services.utils   import _shuffle_merge

# logger = logging.getLogger(__name__)

# SORT_MAP = {
#     "popular": "popularity",
#     "rating":  "vote_average",
#     "newest":  "primary_release_date_desc",
#     "oldest":  "primary_release_date_asc",
# }
# GENRE_NAME_TO_ID = {
#     "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35,
#     "Crime": 80, "Documentary": 99, "Drama": 18, "Family": 10751,
#     "Fantasy": 14, "History": 36, "Horror": 27, "Music": 10402,
#     "Mystery": 9648, "Romance": 10749, "Science Fiction": 878,
#     "Thriller": 53, "War": 10752, "Western": 37,
# }

# def _parse_genre_ids(genre_param: str) -> list[int]:
#     ids = []
#     for g in [g.strip() for g in genre_param.split(",")]:
#         if g.isdigit():            ids.append(int(g))
#         elif g in GENRE_NAME_TO_ID: ids.append(GENRE_NAME_TO_ID[g])
#     return ids

# @api_view(["GET"])
# @permission_classes([AllowAny])
# def movies_list(request):
#     q          = request.GET.get("q", "").strip()
#     type_      = request.GET.get("type", "").strip()
#     genre      = request.GET.get("genre", "")
#     sort       = request.GET.get("sort", "popular")
#     min_rating = float(request.GET.get("minRating", 0) or 0)
#     year_from  = request.GET.get("yearFrom")
#     year_to    = request.GET.get("yearTo")
#     page       = max(1, int(request.GET.get("page", 1) or 1))
#     genre_ids  = _parse_genre_ids(genre) if genre else []

#     if type_ and not q:
#         return Response(get_home_section(type_=type_, genre_ids=genre_ids, page=page))

#     return Response(library_search(
#         query=q, genre_ids=genre_ids,
#         year_from=int(year_from) if year_from else None,
#         year_to=int(year_to)     if year_to   else None,
#         min_rating=min_rating,
#         sort_by=SORT_MAP.get(sort, "popularity"),
#         page=page,
#     ))

# @api_view(["GET"])
# @permission_classes([AllowAny])
# def movie_detail(request, movie_id: str):
#     if movie_id.startswith("archive-"):
#         from .adapters.archive import fetch_detail
#         data = fetch_detail(movie_id.removeprefix("archive-"))
#         if data is None:
#             return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
#         # Return 202 if data is a stub pending background fetch
#         http_status = status.HTTP_202_ACCEPTED if data.get("_pending") else status.HTTP_200_OK
#         return Response(data, status=http_status)

#     elif movie_id.startswith("tmdb-"):
#         from .adapters.tmdb import fetch_detail, fetch_credits
#         tmdb_id = int(movie_id.removeprefix("tmdb-"))
#         data    = fetch_detail(tmdb_id)
#         if not data:
#             return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
#         credits      = fetch_credits(tmdb_id)
#         data["cast"] = credits["cast"]
#         data["crew"] = credits["crew"]
#         return Response(data)

#     return Response({"error": "Invalid id"}, status=status.HTTP_400_BAD_REQUEST)

# @api_view(["GET"])
# @permission_classes([AllowAny])
# def movie_trailer(request, movie_id: str):
#     if not movie_id.startswith("tmdb-"):
#         return Response({"url": None})

#     tmdb_id     = movie_id.removeprefix("tmdb-")
#     body        = safe_get(f"{TMDB_BASE}/movie/{tmdb_id}/videos",
#                        headers=HEADERS, fallback={})
#     trailers    = [v for v in (body or {}).get("results", [])
#                 if v["type"] == "Trailer" and v["site"] == "YouTube"]

#     if not trailers:
#         return Response({"url": None}, status=status.HTTP_404_NOT_FOUND)
#     return Response({"url": f"https://www.youtube.com/embed/{trailers[0]['key']}?autoplay=1&rel=0"})

# @api_view(["GET"])
# @permission_classes([AllowAny])
# def movie_collection(request, collection_id: int):
#     from .adapters.tmdb import fetch_collection
#     data = fetch_collection(collection_id)
#     if not data:
#         return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
#     return Response(data)

# @api_view(["GET"])
# @permission_classes([AllowAny])
# def movie_search(request):
#     q    = request.GET.get("q", "").strip()
#     page = max(1, int(request.GET.get("page", 1) or 1))

#     if not q:
#         return Response({"results": [], "totalPages": 0, "page": 1})

#     from .cache.movie_cache import (
#         get_search_results, set_search_results,
#         get_archive_search, TTL_SEARCH_RESULTS,
#     )
#     from .services.filters import _queue_archive_search
#     from .services.utils import _shuffle_merge
#     from .adapters.tmdb import search as tmdb_search

#     nav_key = f"{q.lower().strip()}:p{page}"

#     # Full cache hit — both sources already merged
#     cached = get_search_results(nav_key, source="navbar")
#     if cached:
#         return Response(cached)

#     # TMDB — always sync, never skipped
#     tmdb_data = tmdb_search(query=q, page=page)

#     # Archive — cache only, zero network, always page=1 key
#     archive_cached  = get_archive_search(q, "", 1)
#     archive_results = (archive_cached or {}).get("results", [])

#     if archive_cached is None:
#         # Fire and forget — next request will hit the warm cache
#         _queue_archive_search(q, genre_ids=[], page=1)

#     merged = _shuffle_merge(tmdb_data.get("results", []), archive_results)
#     result = {
#         "results":          merged,
#         "page":             page,
#         "totalPages":       tmdb_data.get("total_pages", 1),
#         "archive_included": bool(archive_results),
#     }

#     if not archive_results:
#         return Response(result)

#     set_search_results(nav_key, result, source="navbar", ttl=TTL_SEARCH_RESULTS)
#     return Response(result)

# def _queue_navbar_archive(query: str, page: int) -> None:
#     try:
#         from .tasks import search_archive_task
#         search_archive_task.delay(query, page)
#     except Exception:
#         pass

# @api_view(["GET"])
# @permission_classes([AllowAny])
# def movies_runtime_batch(request):
#     raw_ids = request.GET.get("ids", "").strip()
#     if not raw_ids:
#         return Response({}, status=status.HTTP_400_BAD_REQUEST)

#     movie_ids = [i.strip() for i in raw_ids.split(",") if i.strip()]

#     def get_runtime(movie_id: str) -> tuple[str, str]:
#         try:
#             if movie_id.startswith("archive-"):
#                 from .adapters.archive import fetch_runtime
#                 return movie_id, fetch_runtime(movie_id.removeprefix("archive-"))
#             if movie_id.startswith("tmdb-"):
#                 from .adapters.tmdb import fetch_runtime
#                 return movie_id, fetch_runtime(int(movie_id.removeprefix("tmdb-")))
#         except Exception as e:
#             logger.warning("runtime fetch failed for %s: %s", movie_id, e)
#         return movie_id, "N/A"

#     with ThreadPoolExecutor(max_workers=min(len(movie_ids), 10)) as pool:
#         results = dict(pool.map(get_runtime, movie_ids))

#     return Response(results)


# from .adapters.tmdb import BLOCKED_GENRE_IDS

# def _is_safe(movie: dict) -> bool:
#     """Post-normalization gate — runs after both TMDB and Archive normalize."""
#     genre_ids = movie.get("genre_ids") or []
#     if genre_ids and any(g in BLOCKED_GENRE_IDS for g in genre_ids):
#         return False
#     if float(movie.get("rating") or 0) == 0 and movie.get("source") == "tmdb":
#         return False
#     return True

# def _apply_filters(results: list, min_rating: float) -> list:
#     results = [m for m in results if _is_safe(m)]
#     if min_rating > 0:
#         results = [m for m in results if float(m.get("rating") or 0) >= min_rating]
#     return results


# @permission_classes([AllowAny])
# def library_search_stream(request):
#     q          = request.GET.get("q", "").strip()
#     genre      = request.GET.get("genre", "")
#     sort       = request.GET.get("sort", "popular")
#     min_rating = float(request.GET.get("minRating", 0) or 0)
#     year_from  = request.GET.get("yearFrom")
#     year_to    = request.GET.get("yearTo")
#     page       = max(1, int(request.GET.get("page", 1) or 1))
#     genre_ids  = _parse_genre_ids(genre) if genre else []
#     sort_by    = SORT_MAP.get(sort, "popularity")

#     year_from_int = int(year_from) if year_from else None
#     year_to_int   = int(year_to)   if year_to   else None

#     def event_stream():
#         import json, time
#         from .cache.movie_cache import get_archive_search
#         from .adapters import tmdb as tmdb_adapter
#         from .tasks import search_archive_task

#         genre_key = ",".join(str(g) for g in sorted(genre_ids))

#         # ── TMDB event ────────────────────────────────────────────────────────
#         try:
#             tmdb_data    = tmdb_adapter.search(
#                 query=q, genre_ids=genre_ids,
#                 year_from=year_from_int, year_to=year_to_int,
#                 sort_by=sort_by, page=page,
#             )
#             tmdb_results = _apply_filters(tmdb_data.get("results", []), min_rating)
#             yield _sse("tmdb", {
#                 "results":    tmdb_results,
#                 "page":       page,
#                 "totalPages": tmdb_data.get("total_pages", 1),
#             })
#         except Exception as e:
#             logger.error("SSE tmdb fetch failed: %s", e)
#             yield _sse("tmdb", {"results": [], "page": page, "totalPages": 1})

#         # ── Archive event ─────────────────────────────────────────────────────
#         archive_cached = (
#             get_archive_search(q, genre_key, page)
#             or get_archive_search(q, genre_key, 1)
#         )

#         if archive_cached is not None:
#             archive_results = _apply_filters(
#                 archive_cached.get("results", []), min_rating
#             )
#             yield _sse("archive", {"results": archive_results, "cached": True})

#         else:
#             try:
#                 search_archive_task.delay(q, 1, genre_ids)
#             except Exception as e:
#                 logger.warning("SSE: failed to queue archive task: %s", e)

#             deadline = time.time() + 8.0
#             sent     = False
#             while time.time() < deadline:
#                 time.sleep(0.5)
#                 filled = get_archive_search(q, genre_key, 1)
#                 if filled is not None:
#                     archive_results = _apply_filters(
#                         filled.get("results", []), min_rating
#                     )
#                     yield _sse("archive", {"results": archive_results, "cached": False})
#                     sent = True
#                     break

#             if not sent:
#                 yield _sse("archive", {"results": [], "timeout": True})

#         yield "event: done\ndata: {}\n\n"

#     response = StreamingHttpResponse(
#         streaming_content=event_stream(),
#         content_type="text/event-stream; charset=utf-8",
#     )
#     response["Cache-Control"]               = "no-cache"
#     response["X-Accel-Buffering"]           = "no"
#     response["Access-Control-Allow-Origin"] = "*"
#     return response


# def _sse(event: str, data: dict) -> str:
#     import json
#     return f"event: {event}\ndata: {json.dumps(data)}\n\n"




# @api_view(["GET"])
# @permission_classes([AllowAny])
# def movie_search(request):
#     q    = request.GET.get("q", "").strip()
#     page = max(1, int(request.GET.get("page", 1) or 1))

#     if not q:
#         return Response({"results": [], "totalPages": 0, "page": 1})

#     from .adapters.tmdb    import search as tmdb_search
#     from .adapters.archive import fetch_movies as archive_search

#     with ThreadPoolExecutor(max_workers=2) as pool:
#         tf = pool.submit(tmdb_search,    query=q, page=page)
#         af = pool.submit(archive_search, search=q, page=page)
#         tmdb_data = tf.result()
#         try:
#             archive_data = af.result(timeout=8)
#         except Exception:
#             archive_data = {"results": [], "total_pages": 1}

#     merged = _shuffle_merge(tmdb_data.get("results", []),
#                             archive_data.get("results", []))
#     return Response({
#         "results":    merged,
#         "page":       page,
#         "totalPages": max(tmdb_data.get("total_pages", 1),
#                           archive_data.get("total_pages", 1)),
#     })


# movies/views.py — movie_search (navbar) uses same archive cache

# @api_view(["GET"])
# @permission_classes([AllowAny])
# def movie_search(request):
#     q    = request.GET.get("q", "").strip()
#     page = max(1, int(request.GET.get("page", 1) or 1))

#     if not q:
#         return Response({"results": [], "totalPages": 0, "page": 1})

#     from .cache.movie_cache import get_search_results, set_search_results, get_archive_search

#     nav_key = f"{q.lower().strip()}:p{page}"
#     cached  = get_search_results(nav_key, source="navbar")
#     if cached:
#         return Response(cached)

#     from .adapters.tmdb import search as tmdb_search

#     # TMDB — always fetch
#     tmdb_data = tmdb_search(query=q, page=page)

#     # Archive — only if already cached under archive:search: key (zero latency)
#     archive_cached  = get_archive_search(q, "", page)
#     archive_results = (archive_cached or {}).get("results", [])

#     # Queue background fetch if not cached — next navbar search gets it
#     if archive_cached is None:
#         _queue_navbar_archive(q, page)

#     merged = _shuffle_merge(tmdb_data.get("results", []), archive_results)
#     result = {
#         "results":    merged,
#         "page":       page,
#         "totalPages": tmdb_data.get("total_pages", 1),
#     }
#     set_search_results(nav_key, result, source="navbar")
#     return Response(result)
