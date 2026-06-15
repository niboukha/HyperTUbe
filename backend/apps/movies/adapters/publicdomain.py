import json
import math
import re
from difflib import SequenceMatcher
from html import unescape
from urllib.parse import urljoin

import requests

from ..client import safe_get
from ..services.utils import build_response, format_runtime, text_value
from . import tmdb

BASE_URL = "https://www.publicdomaintorrents.info"
CATALOG_URL = f"{BASE_URL}/nshowcat.html"
DETAIL_URL = f"{BASE_URL}/nshowmovie.html"

GENRE_IDS = {
    "action": 28,
    "action/adventure": 28,
    "adventure": 12,
    "animation": 16,
    "comedy": 35,
    "drama": 18,
    "family": 10751,
    "horror": 27,
    "martial arts": 28,
    "musical": 10402,
    "musicals": 10402,
    "mystery": 9648,
    "mystery/suspense": 9648,
    "sci-fi/fantasy": 878,
    "science fiction": 878,
    "war": 10752,
    "westerns": 37,
    "western": 37,
}

CATEGORY_BY_GENRE = {
    28: "ACTION",
    12: "ACTION",
    16: "ANIMATION",
    35: "COMEDY",
    18: "DRAMA",
    10751: "FAMILY",
    27: "HORROR",
    10402: "MUSICALS",
    9648: "MYSTERY",
    878: "SCIFI",
    10752: "WAR",
    37: "WESTERN",
}

BLOCKED_TERMS = [
    "adult", "xxx", "porn", "sex", "erotic", "nsfw",
    "nude", "naked", "softcore", "hardcore",
]
BLOCKED_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in BLOCKED_TERMS) + r")\b",
    re.IGNORECASE,
)

MOVIE_LINK_RE = re.compile(
    r'<a\s+[^>]*href=(?P<quote>["\']?)(?P<href>[^"\'\s>]*nshowmovie\.html\?movieid=(?P<id>\d+)[^"\'\s>]*)'
    r"(?P=quote)[^>]*>"
    r"(?P<title>.*?)</a>",
    re.IGNORECASE | re.DOTALL,
)
TITLE_RE = re.compile(r"<h3[^>]*>(?P<title>.*?)</h3>", re.IGNORECASE | re.DOTALL)
CATEGORIES_RE = re.compile(
    r"Categories:\s*(?P<categories>.*?)(?:User rating:|</?p>|<br\s*/?>)",
    re.IGNORECASE | re.DOTALL,
)
RATING_RE = re.compile(
    r"User rating:\s*(?P<rating>.*?)(?:</td>|<br\s*/?>|</?p>)",
    re.IGNORECASE | re.DOTALL,
)
DOWNLOAD_RE = re.compile(
    r'<a\s+[^>]*href=(?P<quote>["\']?)(?P<href>[^"\'\s>]+)(?P=quote)[^>]*>\s*Click for (?P<label>.*?)</a>',
    re.IGNORECASE | re.DOTALL,
)
IMDB_ID_RE = re.compile(r"\btt\d{7,9}\b", re.IGNORECASE)
YEAR_RE = re.compile(r"\b(19\d{2}|20\d{2})\b")


def _clean_html(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def _is_safe(text: str) -> bool:
    return bool(text_value(text)) and not BLOCKED_PATTERN.search(text or "")


def _catalog_category(genre_ids: list | None) -> str:
    for genre_id in genre_ids or []:
        if genre_id in CATEGORY_BY_GENRE:
            return CATEGORY_BY_GENRE[genre_id]
    return "ALL"


def _genre_ids_from_names(names: list[str]) -> list[int]:
    ids = []
    for name in names:
        genre_id = GENRE_IDS.get(name.strip().lower())
        if genre_id and genre_id not in ids:
            ids.append(genre_id)
    return ids


def _rating_from_html(fragment: str) -> float:
    if "Not Yet Rated" in fragment:
        return 0
    count = fragment.lower().count("<img")
    return float(min(count * 2, 10))


def _title_matches(title: str, search: str | None) -> bool:
    if not search:
        return True
    needle = search.strip().lower()
    return needle in title.lower()


def _split_title_year(title: str) -> tuple[str, int | None]:
    cleaned = text_value(title)
    year_match = YEAR_RE.search(cleaned)
    year = int(year_match.group(1)) if year_match else None
    if year:
        cleaned = re.sub(r"\(?\b" + str(year) + r"\b\)?", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -:()[]")
    return cleaned or text_value(title), year


def _extract_imdb_id(html: str) -> str | None:
    match = IMDB_ID_RE.search(html or "")
    return match.group(0).lower() if match else None


def _resolve_tmdb_id_by_imdb(imdb_id: str | None) -> int | None:
    if not imdb_id:
        return None

    body = safe_get(
        f"{tmdb.TMDB_BASE}/find/{imdb_id}",
        headers=tmdb.HEADERS,
        params={"external_source": "imdb_id"},
        timeout=tmdb.TMDB_TIMEOUT,
        retries=tmdb.TMDB_RETRIES,
        fallback={},
    )
    movies = (body or {}).get("movie_results") or []
    return movies[0].get("id") if movies else None


def _movie_score(candidate: dict, title: str, year: int | None) -> float:
    candidate_title = text_value(candidate.get("title") or candidate.get("original_title")).lower()
    title_score = SequenceMatcher(None, text_value(title).lower(), candidate_title).ratio()
    candidate_year = ((candidate.get("release_date") or "")[:4] or None)
    if year and candidate_year:
        try:
            distance = abs(int(candidate_year) - year)
        except ValueError:
            distance = 10
        if distance == 0:
            title_score += 0.25
        elif distance == 1:
            title_score += 0.1
        elif distance > 3:
            title_score -= 0.25
    title_score += min(float(candidate.get("popularity") or 0), 50) / 500
    return title_score


def _resolve_tmdb_id_by_title(title: str, year: int | None = None) -> int | None:
    if not text_value(title):
        return None

    params = {"query": title, "include_adult": False, "page": 1}
    if year:
        params["year"] = year

    body = safe_get(
        f"{tmdb.TMDB_BASE}/search/movie",
        headers=tmdb.HEADERS,
        params=params,
        timeout=tmdb.TMDB_TIMEOUT,
        retries=tmdb.TMDB_RETRIES,
        fallback={},
    )
    results = [
        movie for movie in (body or {}).get("results") or []
        if not movie.get("adult")
    ]
    if not results:
        return None
    return max(results, key=lambda movie: _movie_score(movie, title, year)).get("id")


def _resolve_tmdb_id(title: str, html: str = "") -> int | None:
    imdb_id = _extract_imdb_id(html)
    tmdb_id = _resolve_tmdb_id_by_imdb(imdb_id)
    if tmdb_id:
        return tmdb_id

    search_title, year = _split_title_year(title)
    return _resolve_tmdb_id_by_title(search_title, year)


def _enrich_with_tmdb(movie: dict, html: str = "", include_credits: bool = False, language: str = "en") -> dict:
    try:
        tmdb_id = _resolve_tmdb_id(movie.get("title"), html)
        if not tmdb_id:
            return movie

        detail = tmdb.fetch_detail(tmdb_id, language=language)
        if not detail:
            return movie

        enriched = {
            **movie,
            "tmdb_id": detail.get("tmdb_id") or tmdb_id,
            "imdb_id": detail.get("imdb_id") or _extract_imdb_id(html),
            "title": detail.get("title") or movie.get("title"),
            "original_title": detail.get("original_title") or movie.get("original_title"),
            "tagline": detail.get("tagline") or movie.get("tagline", ""),
            "overview": detail.get("overview") or movie.get("overview"),
            "year": detail.get("year") or movie.get("year"),
            "release_date": detail.get("release_date") or movie.get("release_date"),
            "runtime": detail.get("runtime") or movie.get("runtime"),
            "poster_path": detail.get("poster_path") or movie.get("poster_path"),
            "backdrop_path": detail.get("backdrop_path") or movie.get("backdrop_path"),
            "rating": detail.get("rating") if detail.get("rating") is not None else movie.get("rating"),
            "vote_count": detail.get("vote_count") or movie.get("vote_count"),
            "popularity": detail.get("popularity") or movie.get("popularity"),
            "genres": detail.get("genres") or movie.get("genres", []),
            "genre_ids": detail.get("genre_ids") or movie.get("genre_ids", []),
            "collection": detail.get("collection") or movie.get("collection"),
            "languages": detail.get("languages") or movie.get("languages", []),
        }

        if include_credits:
            credits = tmdb.fetch_credits(tmdb_id)
            if credits.get("cast"):
                enriched["cast"] = credits["cast"]
        return enriched
    except Exception:
        return movie


def enrich_movie(movie: dict, language: str = "en") -> dict:
    if movie.get("source") != "publicdomain":
        return movie

    publicdomain_id = movie.get("publicdomain_id") or str(movie.get("id", "")).removeprefix("publicdomain-")
    if not publicdomain_id:
        return _enrich_with_tmdb(movie, language=language)

    from ..cache.movie_cache import get_detail, set_detail

    cache_key = f"publicdomain-card-{publicdomain_id}:{language}"
    cached = get_detail(cache_key)
    if cached:
        return {**movie, **cached}

    enriched = _enrich_with_tmdb(movie, language=language)
    set_detail(cache_key, enriched)
    return enriched


def _normalize_list(movie_id: str, title: str, genre_ids: list[int] | None = None) -> dict:
    title       = text_value(title)
    popularity  = max(1, 1000 - int(movie_id))
    
    return {
        "id":           f"publicdomain-{movie_id}",
        "type":         "movie",
        "publicdomain_id": movie_id,
        "source":       "publicdomain",
        "availability": "free",
        "title":        title,
        "overview":     "",
        "year":         "N/A",
        "rating":       0,
        "vote_count":   popularity,
        "downloads":    popularity,
        "popularity":   popularity,
        "genre_ids":    genre_ids or [],
        "poster_path":  None,
        "backdrop_path": None,
        "runtime":      "N/A",
        "watch_url":    f"{DETAIL_URL}?movieid={movie_id}",
    }


def _sort_results(movies: list, sort_by: str) -> list:
    if sort_by in {"name", "title"}:
        movies.sort(key=lambda m: text_value(m.get("title")).lower())
    elif sort_by == "primary_release_date_asc":
        movies.sort(key=lambda m: (m.get("year") or "9999", text_value(m.get("title")).lower()))
    elif sort_by == "primary_release_date_desc":
        movies.sort(key=lambda m: (m.get("year") or "", text_value(m.get("title")).lower()), reverse=True)
    elif sort_by in {"rating", "vote_average"}:
        movies.sort(key=lambda m: (-float(m.get("rating") or 0), text_value(m.get("title")).lower()))
    else:
        movies.sort(key=lambda m: (-float(m.get("popularity") or 0), text_value(m.get("title")).lower()))
    return movies


def fetch_movies(
    search: str = None,
    genre_ids: list = None,
    year: int = None,
    year_from: int = None,
    year_to: int = None,
    sort_by: str = "downloads",
    page: int = 1,
    rows: int = 20,
    timeout: float = 8.0,
    enrich: bool = False,
) -> dict:
    del year, year_from, year_to

    params = {"category": _catalog_category(genre_ids)}
    try:
        response = requests.get(CATALOG_URL, params=params, timeout=timeout)
        response.raise_for_status()
    except requests.RequestException:
        data = build_response({}, [])
        data["upstream_failed"] = True
        return data

    found = []
    seen  = set()
    for match in MOVIE_LINK_RE.finditer(response.text):
        movie_id = match.group("id")
        title = _clean_html(match.group("title"))
        if movie_id in seen or not _is_safe(title) or not _title_matches(title, search):
            continue
        seen.add(movie_id)
        found.append(_normalize_list(movie_id, title, genre_ids or []))

    _sort_results(found, sort_by)
    page = max(1, int(page or 1))
    rows = max(1, int(rows or 20))
    start = (page - 1) * rows
    end = start + rows

    body = {
        "page": page,
        "total_pages": max(1, math.ceil(len(found) / rows)),
        "total_results": len(found),
    }
    results = found[start:end]
    if enrich:
        results = [_enrich_with_tmdb(movie) for movie in results]
    return build_response(body, results)
    
def fetch_detail(publicdomain_id: str, language: str = "en") -> dict | None:
    try:
        response = requests.get(
            DETAIL_URL,
            params={"movieid": publicdomain_id},
            timeout=8,
        )
        response.raise_for_status()
    except requests.RequestException:
        return None
    
    html        = response.text
    title_match = TITLE_RE.search(html)
    title       = _clean_html(title_match.group("title")) if title_match else ""
    if not _is_safe(title):
        return None

    category_match = CATEGORIES_RE.search(html)
    category_names = []
    if category_match:
        category_names = [
            _clean_html(part)
            for part in re.split(r",|</a>", category_match.group("categories"))
            if _clean_html(part)
        ]
    genre_ids = _genre_ids_from_names(category_names)

    rating_match    = RATING_RE.search(html)
    rating          = _rating_from_html(rating_match.group("rating")) if rating_match else 0

    downloads = []
    for match in DOWNLOAD_RE.finditer(html):
        downloads.append({
            "label":    _clean_html(match.group("label")),
            "url":      urljoin(BASE_URL, unescape(match.group("href"))),
        })

    # check this for torrents:
    torrent_files   = [item for item in downloads if ".torrent" in item["url"].lower()]
    overview        = _overview_from_detail(html)
    movie           = {
        "id":             f"publicdomain-{publicdomain_id}",
        "type":           "movie",
        "publicdomain_id": publicdomain_id,
        "source":         "publicdomain",
        "availability":   "free",
        "title":          title,
        "original_title": title,
        "tagline":        "",
        "overview":       overview,
        "year":           "N/A",
        "release_date":   None,
        "runtime":        format_runtime(None),
        "poster_path":    None,
        "backdrop_path":  None,
        "rating":         rating,
        "vote_count":     0,
        "downloads":      0,
        "popularity":     0,
        "genre_ids":      genre_ids,
        "genres":         _genre_objects(genre_ids),
        "collection":     None,
        "studios":        [],
        "countries":      [],
        "languages":      [],
        "watch_url":      f"{DETAIL_URL}?movieid={publicdomain_id}",
        "download_links": downloads,
        "torrent_files":  torrent_files,
    }

    movie = _enrich_with_tmdb(movie, html, include_credits=True, language=language)

    print("PUBLICDOMAIN_TORRENT_FILES:")
    print(json.dumps(torrent_files, indent=2, ensure_ascii=False))
    print("PUBLICDOMAIN_MOVIE_OBJECT:")
    print(json.dumps(movie, indent=2, ensure_ascii=False))

    return movie

def _genre_objects(genre_ids: list[int]) -> list[dict]:
    seen    = set()
    genres  = []
    for name, genre_id in GENRE_IDS.items():
        if genre_id not in genre_ids or genre_id in seen:
            continue
        seen.add(genre_id)
        genres.append({"id": genre_id, "name": name.title()})
    return genres

def _overview_from_detail(html: str) -> str:
    body        = html
    title_match = TITLE_RE.search(body)
    if title_match:
        body = body[title_match.end():]

    body = re.split(r"Internet Movie DataBase Info|Click Here for IMDB|User Comments:", body, maxsplit=1)[0]
    body = re.sub(r"Categories:.*?User rating:.*?(?:</?p>|<br\s*/?>)?", " ", body, flags=re.IGNORECASE | re.DOTALL)
    body = re.sub(r"<img[^>]*>", " ", body, flags=re.IGNORECASE)
    return _clean_html(body)
