import html
import math
import re
from urllib.parse import quote_plus

import requests

from ..services.utils import build_response, text_value

BASE_URL = "https://legittorrents.org"

BLOCKED_TERMS = re.compile(
    r"\b(xxx|porn|sex|adult|nude|naked|erotic|erotik|hentai|softcore|hardcore)\b",
    re.IGNORECASE,
)

VIDEO_HINTS = re.compile(
    r"\b(movie|film|video|documentary|short|episode|series|tv|720p|1080p|mp4|mkv|avi)\b",
    re.IGNORECASE,
)


def fetch_movies(search: str = "", page: int = 1, rows: int = 80,
                 timeout: float = 6.0) -> dict:
    """
    Optional legal-torrent provider.

    legittorrents.info is now a shutdown page; legittorrents.org currently exposes
    a compatible public search UI. If it changes or goes down, return an empty
    response so Archive/TMDB keep the app working.
    """
    terms = [search.strip()] if search else ["movie", "film", "documentary"]
    results = []

    for term in terms:
        if len(results) >= rows:
            break
        url = (
            f"{BASE_URL}/search.php?catname=movies&q={quote_plus(term)}"
            "&orderby=DESC&order=seeders"
        )
        try:
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()
        except requests.RequestException:
            continue

        results.extend(_parse_results(response.text))

    deduped = []
    seen = set()
    for item in results:
        if item["id"] in seen:
            continue
        seen.add(item["id"])
        deduped.append(item)
        if len(deduped) >= rows:
            break

    start = max(0, (page - 1) * rows)
    page_results = deduped[start:start + rows]
    return build_response(
        {
            "page": page,
            "total_pages": max(1, math.ceil(len(deduped) / rows)),
            "total_results": len(deduped),
        },
        page_results,
    )


def _parse_results(markup: str) -> list[dict]:
    tbody_match = re.search(
        r'<tbody class="torsearch">(.*?)</tbody>',
        markup,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not tbody_match:
        return []

    rows = re.findall(r"<tr\b.*?</tr>", tbody_match.group(1), flags=re.IGNORECASE | re.DOTALL)
    parsed = []
    for row in rows:
        item = _parse_row(row)
        if item:
            parsed.append(item)
    parsed.sort(key=lambda m: (m["seeders"], m["peers"], m["popularity"]), reverse=True)
    return parsed


def _parse_row(row: str) -> dict | None:
    links = re.findall(
        r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        row,
        flags=re.IGNORECASE | re.DOTALL,
    )
    title = ""
    detail_url = ""
    for href, label in links:
        clean_label = _clean_html(label)
        if clean_label and not clean_label.lower().endswith("download"):
            title = clean_label
            detail_url = html.unescape(href)

    if not title or BLOCKED_TERMS.search(title):
        return None
    if not VIDEO_HINTS.search(title):
        return None

    seeders = _first_int(r'class="tdseed"[^>]*>\s*([\d,]+)', row)
    leechers = _first_int(r'class="tdleech"[^>]*>\s*([\d,]+)', row)
    size = _first_text(r'<td class="tdnormal">\s*([^<]+)\s*</td>\s*<td class="tdseed"', row)
    year = _guess_year(title)
    external_id = _external_id(detail_url, title)
    peers = seeders + leechers

    return {
        "id":           f"legittorrents-{external_id}",
        "type":         "movie",
        "source":       "legittorrents",
        "availability": "free",
        "title":        title,
        "overview":     f"Legal torrent from Legit Torrents. Size: {size}" if size else "Legal torrent from Legit Torrents.",
        "year":         str(year or ""),
        "rating":       0,
        "vote_count":   peers,
        "popularity":   seeders * 3 + leechers,
        "seeders":      seeders,
        "leechers":     leechers,
        "peers":        peers,
        "downloads":    0,
        "genre_ids":    [],
        "poster_path":  None,
        "backdrop_path": None,
        "runtime":      "N/A",
        "watch_url":    detail_url if detail_url.startswith("http") else f"{BASE_URL}{detail_url}",
    }


def _clean_html(value: str) -> str:
    value = re.sub(r"<.*?>", "", value, flags=re.DOTALL)
    return text_value(html.unescape(value))


def _first_int(pattern: str, text: str) -> int:
    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return 0
    return int(match.group(1).replace(",", ""))


def _first_text(pattern: str, text: str) -> str:
    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    return _clean_html(match.group(1)) if match else ""


def _guess_year(title: str) -> int | None:
    match = re.search(r"\b(19\d{2}|20\d{2})\b", title)
    return int(match.group(1)) if match else None


def _external_id(url: str, title: str) -> str:
    match = re.search(r"-(\d+)\.html", url)
    if match:
        return match.group(1)
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80]
