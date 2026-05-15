
import random
import re


def build_response(body: dict, results: list) -> dict:
    """Standard paginated response shape."""
    return {
        "results":       results,
        "page":          body.get("page", 1),
        "total_pages":   min(body.get("total_pages", 1), 500),
        "total_results": body.get("total_results", len(results)),
    }

def _shuffle_merge(a: list, b: list) -> list:
    merged = a + b
    random.shuffle(merged)
    return merged

def _interleave(primary: list, secondary: list, ratio: float = 0.7) -> list:
    """Keep primary order, sprinkle in secondary items randomly."""
    result = list(primary)
    count  = max(1, int(len(secondary) * (1 - ratio)))
    picks  = random.sample(secondary, min(count, len(secondary)))
    for item in picks:
        result.insert(random.randint(0, len(result)), item)
    return result

def format_runtime(runtime) -> str:
    if not runtime:
        return "N/A"
    if isinstance(runtime, int):
        h, m = divmod(runtime, 60)
        return f"{h}h {m}m"
    if not isinstance(runtime, str):
        return "N/A"
    runtime = runtime.strip().lower()
    m = re.search(r"(\d+)\s*min", runtime)
    if m:
        h, mins = divmod(int(m.group(1)), 60)
        return f"{h}h {mins}m"
    parts = runtime.split(":")
    try:
        if len(parts) == 3:
            h, mins, _ = map(int, parts)
            return f"{h}h {mins}m"
        if len(parts) == 2:
            total, _ = map(int, parts)
            h, mins  = divmod(total, 60)
            return f"{h}h {mins}m"
    except ValueError:
        pass
    return "N/A"




#  {
#       "adult": false,
#       "backdrop_path": "/qO55CD8tgVL1T4WKn6zYFFiD6lL.jpg",
#       "id": 1439930,
#       "title": "A Marvel Television Special Presentation - The Punisher: One Last Kill",
#       "original_title": "A Marvel Television Special Presentation - The Punisher: One Last Kill",
#       "overview": "As Frank Castle searches for meaning beyond revenge, an unexpected force pulls him back into the fight.",
#       "poster_path": "/gOggsBCSypNXq0yApYeXe7nnopT.jpg",
#       "media_type": "movie",
#       "original_language": "en",
#       "genre_ids": [
#         28,
#         18,
#         80
#       ],
#       "popularity": 34.1264,
#       "release_date": "2026-05-12",
#       "softcore": false,
#       "video": false,
#       "vote_average": 7.631,
#       "vote_count": 42
#     },



# {
#   "adult": false,
#   "backdrop_path": "/9dMp9t0d0nIGhiil8TyqChwiNwA.jpg",
#   "belongs_to_collection": {
#     "id": 1267164,
#     "name": "Ready or Not Collection",
#     "poster_path": "/i0MDcTw6YdY1YWKwe4p6qY8jPbX.jpg",
#     "backdrop_path": "/5webUKxijJEvolYGWXzM2zw5f9T.jpg"
#   },
#   "budget": 14000000,
#   "genres": [
#     {
#       "id": 27,
#       "name": "Horror"
#     },
#     {
#       "id": 35,
#       "name": "Comedy"
#     }
#   ],
#   "homepage": "https://www.searchlightpictures.com/ready-or-not-2-here-i-come",
#   "id": 1266127,
#   "imdb_id": "tt33978029",
#   "origin_country": [
#     "US"
#   ],
#   "original_language": "en",
#   "original_title": "Ready or Not 2: Here I Come",
#   "overview": "Moments after surviving an all-out attack from the Le Domas family, Grace discovers she’s reached the next level of the nightmarish game — and this time with her estranged sister Faith at her side. Grace has one chance to survive, keep her sister alive, and claim the High Seat of the Council that controls the world. Four rival families are hunting her for the throne, and whoever wins rules it all.",
#   "popularity": 179.0672,
#   "poster_path": "/13ZcJzSGEqVgDSqsS9U5EkQwPkV.jpg",
#   "production_companies": [
#     {
#       "id": 127929,
#       "logo_path": "/7DLKyL15ETI9645XSr9JcbMV79c.png",
#       "name": "Searchlight Pictures",
#       "origin_country": "US"
#     },
#     {
#       "id": 34982,
#       "logo_path": "/uvTmiRZzNfG88dVXi9hQ7eFNirq.png",
#       "name": "Mythology Entertainment",
#       "origin_country": "US"
#     },
#     {
#       "id": 126588,
#       "logo_path": "/cNhOITS96oOV7SCgUHxvZlWRecx.png",
#       "name": "Radio Silence",
#       "origin_country": "US"
#     },
#     {
#       "id": 6831,
#       "logo_path": "/fWSI4EjIDEEzCNJC8OTPX9Pdbxv.png",
#       "name": "Big Indie Pictures",
#       "origin_country": "US"
#     }
#   ],
#   "production_countries": [
#     {
#       "iso_3166_1": "US",
#       "name": "United States of America"
#     }
#   ],
#   "release_date": "2026-03-19",
#   "revenue": 42212563,
#   "runtime": 108,
#   "softcore": false,
#   "spoken_languages": [
#     {
#       "english_name": "English",
#       "iso_639_1": "en",
#       "name": "English"
#     },
#     {
#       "english_name": "Spanish",
#       "iso_639_1": "es",
#       "name": "Español"
#     },
#     {
#       "english_name": "Mandarin",
#       "iso_639_1": "zh",
#       "name": "普通话"
#     }
#   ],
#   "status": "Released",
#   "tagline": "Double or nothing.",
#   "title": "Ready or Not 2: Here I Come",
#   "video": false,
#   "vote_average": 7.511,
#   "vote_count": 617
# }