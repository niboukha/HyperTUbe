"""
View-layer helpers for the streaming app.
"""
import os
import logging

from django.http import FileResponse, Http404

from .subtitles import normalize_subtitle_language
from .models import Subtitle

logger = logging.getLogger(__name__)


def media_file_response(path: str, content_type: str) -> FileResponse:
    if not path or not os.path.exists(path):
        raise Http404("Media file not found")
    response = FileResponse(open(path, "rb"), content_type=content_type)
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type"
    return response


def preferred_subtitle_language(request) -> str | None:
    """
    Resolve subtitle language from ?language= query param, then Accept-Language header.
    Returns None if neither is present or parseable.
    """
    explicit = request.query_params.get("language")
    if explicit:
        return normalize_subtitle_language(explicit)

    accept = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
    for part in accept.split(","):
        lang = normalize_subtitle_language(part.split(";", 1)[0])
        if lang:
            return lang

    return None


def subtitle_asset_exists(subtitle: Subtitle) -> bool:
    if subtitle.file:
        return subtitle.file.storage.exists(subtitle.file.name)
    return bool(subtitle.subtitle_link)


def mark_stale_subtitle(subtitle: Subtitle) -> None:
    subtitle.status = Subtitle.Status.FAILED
    subtitle.save(update_fields=["status"])
