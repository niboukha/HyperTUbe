from ..adapters.tmdb import fetch_tmdb_movies
from ..adapters.archive import fetch_archive_movies

PAGE_SIZE = 30
def get_movies(search=None, genre=None, page=1):
    # FETCH from all sources
    tmdb_movies = fetch_tmdb_movies(search=search, genre=genre)
    archive_movies = fetch_archive_movies(search=search or genre)

    print(f"Fetched {len(tmdb_movies)} from TMDB, {len(archive_movies)} from Archive")
    
    merged = merge_movies(tmdb_movies, archive_movies)

    return paginate_cursor(merged, cursor=(page - 1) * PAGE_SIZE, page_size=PAGE_SIZE)


def paginate_cursor(movies, cursor=0, page_size=20):
    next_cursor = cursor + page_size

    return {
        "results": movies[cursor:next_cursor],
        "next_cursor": next_cursor if next_cursor < len(movies) else None
    }

def normalize_key(title, year):
    return f"{title.lower().strip()}-{year}"

def merge_movies(tmdb, archive):
    merged = {}

    # TMDB (base catalog)
    # for m in tmdb:
    #     key = normalize_key(
    #         m.get("title"),
    #         (m.get("release_date") or "")[:4]
    #     )

    #     merged[key] = {
    #         "id": m.get("id"),
    #         "title": m.get("title"),
    #         "overview": m.get("overview"),
    #         "poster_path": m.get("poster_path"),
    #         "backdrop_path": m.get("backdrop_path"),
    #         "year": (m.get("release_date") or "")[:4],
    #         "rating": m.get("vote_average"),
    #         "release_date": m.get("release_date"),

    #         # important default
    #         "availability": "premium",
    #         "sources": ["tmdb"]
    #     }

    # Archive (adds watchable)
    for a in archive:
        key = normalize_key(a["title"], a.get("year"))

        if key in merged:
            merged[key]["availability"] = "free"
            merged[key]["sources"].append("archive")
        else:
            merged[key] = {
                "id": a.get("id"),
                "title": a["title"],
                "overview": a.get("overview"),
                "poster_path": a.get("poster_path"),
                "backdrop_path": a.get("backdrop_path"),
                "year": a.get("year"),
                "rating": 0,
                "release_date": a.get("release_date"),

                # important default
                "availability": "free",
                "sources": ["archive"]
            }

    # Torrents (also makes watchable)
    # for t in torrents:
    #     key = normalize_key(t["title"], t.get("year"))

    #     if key in merged:
    #         merged[key]["availability"] = "free"
    #         merged[key]["sources"].append("torrent")

    return list(merged.values())