# movies/services/merger.py
def get_home_section(type_: str, genre_ids: list = None, page: int = 1) -> dict:
    try:
        if type_ != "genre":
            resp = tmdb.fetch_by_type(type_, page)
            return {"results": resp["results"], "page": page,
                    "total_pages": resp["total_pages"]}

        if genre_ids:
            tmdb_resp    = tmdb.fetch_by_genre(genre_ids, page)
            archive_resp = archive.fetch_movies(genre_ids=genre_ids, page=page)
            return {
                "results":     _shuffle_merge(tmdb_resp["results"], archive_resp["results"]),
                "page":        page,
                "total_pages": max(tmdb_resp["total_pages"], archive_resp["total_pages"]),
            }

        resp = tmdb.fetch_by_type("trending", page)
        return {"results": resp["results"], "page": page,
                "total_pages": resp["total_pages"]}

    except Exception as e:
        import traceback
        traceback.print_exc()      # ✅ prints full traceback to Django console
        raise                      # re-raise so DRF returns 500 with detailZ