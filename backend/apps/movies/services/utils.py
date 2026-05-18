import random
import re


def build_response(body: dict, results: list) -> dict:
    return {
        "results":       results,
        "page":          body.get("page", 1),
        "total_pages":   min(body.get("total_pages", 1), 500),
        "total_results": body.get("total_results", len(results)),
    }


def text_value(value, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, list):
        value = " ".join(str(v) for v in value if v is not None)
    return str(value).strip() or default


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


def deduplicate(movies: list) -> list:
    seen, result = set(), []
    for m in movies:
        mid = m.get("id")
        if mid and mid not in seen:
            seen.add(mid)
            result.append(m)
    return result


def sort_results(movies: list, sort_by: str) -> list:
    def title(movie: dict) -> str:
        return text_value(movie.get("title")).lower()

    def year(movie: dict) -> int | None:
        try:
            return int(str(movie.get("year") or "")[:4])
        except ValueError:
            return None

    if sort_by == "primary_release_date_desc":
        movies.sort(key=lambda m: (-(year(m) or -1), title(m)))
    elif sort_by == "primary_release_date_asc":
        movies.sort(key=lambda m: (year(m) if year(m) is not None else 9999, title(m)))
    elif sort_by in {"rating", "vote_average"}:
        movies.sort(
            key=lambda m: (
                -float(m.get("rating") or 0),
                -int(m.get("vote_count") or 0),
                title(m),
            )
        )
    elif sort_by == "popularity":
        movies.sort(
            key=lambda m: (
                -float(m.get("popularity") or 0),
                -int(m.get("vote_count") or 0),
                -float(m.get("rating") or 0),
                title(m),
            )
        )
    else:
        movies.sort(key=title)
    return movies


def _shuffle_merge(a: list, b: list) -> list:
    merged = a + b
    random.shuffle(merged)
    return merged
