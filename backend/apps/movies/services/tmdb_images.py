TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"


def get_poster(path, size="w500"):
    if not path:
        return None
    return f"{TMDB_IMAGE_BASE}/{size}{path}"


def get_backdrop(path, size="w780"):
    if not path:
        return None
    return f"{TMDB_IMAGE_BASE}/{size}{path}"
