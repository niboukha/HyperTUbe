import gzip
import os
import tempfile
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import requests
from django.core.files.base import ContentFile

from apps.movies.models import Movie
from apps.streaming.models import Subtitle
from apps.streaming.subtitles import convert_srt_to_vtt

class SubtitleProviderError(Exception):
    pass

@dataclass(frozen=True)
class OpenSubtitlesResult:
    provider_id: str
    file_id: int
    file_name: str
    language: str


class OpenSubtitlesClient:
    base_url = "https://api.opensubtitles.com/api/v1"

    def __init__(self):
        self.api_key    = os.getenv("OPENSUBTITLES_API_KEY")
        self.username   = os.getenv("OPENSUBTITLES_USERNAME")
        self.password   = os.getenv("OPENSUBTITLES_PASSWORD")
        self.user_agent = os.getenv("OPENSUBTITLES_USER_AGENT", "Hypertube v1")
        self.token      = os.getenv("OPENSUBTITLES_TOKEN")

        if not self.api_key:
            raise SubtitleProviderError("Missing OPENSUBTITLES_API_KEY")

    def _headers(self, authenticated: bool = False) -> dict[str, str]:
        headers = {
            "Api-Key": self.api_key,
            "User-Agent": self.user_agent,
            "Content-Type": "application/json",
        }
        if authenticated:
            if not self.token:
                self.token = self._login()
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def _login(self) -> str:
        if not self.username or not self.password:
            raise SubtitleProviderError(
                "OpenSubtitles download requires OPENSUBTITLES_USERNAME and OPENSUBTITLES_PASSWORD"
            )

        response = requests.post(
            f"{self.base_url}/login",
            headers=self._headers(authenticated=False),
            json={"username": self.username, "password": self.password},
            timeout=15,
        )
        response.raise_for_status()
        token = response.json().get("token")
        if not token:
            raise SubtitleProviderError("OpenSubtitles login did not return a token")
        return token

    def search_movie_subtitles(self, movie: Movie, language: str) -> list[OpenSubtitlesResult]:
        params = {
            "languages": language,
            "query": movie.title,
        }
        if movie.release_date:
            params["year"] = movie.release_date.year

        response = requests.get(
            f"{self.base_url}/subtitles",
            headers=self._headers(authenticated=False),
            params=params,
            timeout=15,
        )
        response.raise_for_status()

        results = []
        for item in response.json().get("data", []):
            attributes = item.get("attributes") or {}
            files = attributes.get("files") or []
            if not files:
                continue

            first_file = files[0]
            file_id = first_file.get("file_id")
            if not file_id:
                continue

            results.append(
                OpenSubtitlesResult(
                    provider_id=str(item.get("id")),
                    file_id=file_id,
                    file_name=first_file.get("file_name") or "subtitle.srt",
                    language=attributes.get("language") or language,
                )
            )

        return results

    def download_subtitle_file(self, result: OpenSubtitlesResult) -> tuple[str, bytes]:
        response = requests.post(
            f"{self.base_url}/download",
            headers=self._headers(authenticated=True),
            json={"file_id": result.file_id},
            timeout=15,
        )
        response.raise_for_status()

        download_url = response.json().get("link")
        if not download_url:
            raise SubtitleProviderError("OpenSubtitles download did not return a link")

        file_response = requests.get(download_url, timeout=30)
        file_response.raise_for_status()
        return result.file_name, file_response.content


def download_external_subtitle_fallback(movie_id: int, language: str) -> Subtitle | None:
    """
    Download one external subtitle only when no ready subtitle exists yet.
    """
    movie = Movie.objects.get(id=movie_id)
    normalized_language = language.lower()

    existing = Subtitle.objects.filter(
        movie=movie,
        language=normalized_language,
        status=Subtitle.Status.READY,
    ).first()
    if existing:
        return existing

    client = OpenSubtitlesClient()
    results = client.search_movie_subtitles(movie=movie, language=normalized_language)
    if not results:
        return None

    selected = results[0]
    file_name, content = client.download_subtitle_file(selected)
    subtitle_text = _decode_subtitle_payload(file_name=file_name, content=content)

    with tempfile.TemporaryDirectory() as tmp_dir:
        srt_path = Path(tmp_dir) / "subtitle.srt"
        vtt_path = Path(tmp_dir) / "subtitle.vtt"

        if subtitle_text.lstrip().startswith("WEBVTT"):
            vtt_path.write_text(subtitle_text, encoding="utf-8")
        else:
            srt_path.write_text(subtitle_text, encoding="utf-8")
            convert_srt_to_vtt(str(srt_path), str(vtt_path))

        subtitle = Subtitle(
            movie=movie,
            language=normalized_language,
            label=normalized_language.upper(),
            source=Subtitle.Source.EXTERNAL,
            status=Subtitle.Status.READY,
            subtitle_link="",
        )
        subtitle.file.save(
            f"movie_{movie.id}/{normalized_language}.opensubtitles.{selected.provider_id}.vtt",
            ContentFile(vtt_path.read_bytes()),
            save=True,
        )

    return subtitle


def _decode_subtitle_payload(file_name: str, content: bytes) -> str:
    lower_name = file_name.lower()

    if lower_name.endswith(".gz"):
        content = gzip.decompress(content)

    if lower_name.endswith(".zip"):
        with zipfile.ZipFile(BytesIO(content)) as archive:
            subtitle_names = [
                name for name in archive.namelist()
                if name.lower().endswith((".srt", ".vtt"))
            ]
            if not subtitle_names:
                raise SubtitleProviderError("Downloaded zip does not contain SRT/VTT subtitles")
            content = archive.read(subtitle_names[0])

    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue

    raise SubtitleProviderError("Could not decode downloaded subtitle file")
