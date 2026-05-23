import json
import math
import re
from html import unescape
from urllib.parse import urljoin

import requests

from ..services.utils import build_response, format_runtime, text_value

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
    seen = set()
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
    return build_response(body, found[start:end])
    
def fetch_detail(publicdomain_id: str) -> dict | None:
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
    torrent_files = [item for item in downloads if ".torrent" in item["url"].lower()]

    overview = _overview_from_detail(html)

    movie = {
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

    print("PUBLICDOMAIN_TORRENT_FILES:")
    print(json.dumps(torrent_files, indent=2, ensure_ascii=False))
    print("PUBLICDOMAIN_MOVIE_OBJECT:")
    print(json.dumps(movie, indent=2, ensure_ascii=False))

    return movie

def _genre_objects(genre_ids: list[int]) -> list[dict]:
    seen = set()
    genres = []
    for name, genre_id in GENRE_IDS.items():
        if genre_id not in genre_ids or genre_id in seen:
            continue
        seen.add(genre_id)
        genres.append({"id": genre_id, "name": name.title()})
    return genres

def _overview_from_detail(html: str) -> str:
    body            = html
    title_match = TITLE_RE.search(body)
    if title_match:
        body = body[title_match.end():]
    body = re.split(r"Internet Movie DataBase Info|Click Here for IMDB|User Comments:", body, maxsplit=1)[0]
    body = re.sub(r"Categories:.*?User rating:.*?(?:</?p>|<br\s*/?>)?", " ", body, flags=re.IGNORECASE | re.DOTALL)
    body = re.sub(r"<img[^>]*>", " ", body, flags=re.IGNORECASE)
    return _clean_html(body)
