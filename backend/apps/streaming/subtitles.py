import json
import logging
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


SUBTITLE_LANGUAGE_ALIASES = {
    "ara": "ar",
    "ar": "ar",
    "arabic": "ar",
    "eng": "en",
    "en": "en",
    "english": "en",
    "fre": "fr",
    "fra": "fr",
    "fr": "fr",
    "french": "fr",
    "spa": "es",
    "es": "es",
    "spanish": "es",
}

def normalize_subtitle_language(language: str | None) -> str | None:
    """Return a browser/provider friendly language code when we can."""
    if not language:
        return None

    normalized = language.strip().lower().split("-")[0].split("_")[0]
    if not normalized:
        return None

    return SUBTITLE_LANGUAGE_ALIASES.get(normalized, normalized)


@dataclass(frozen=True)
class DetectedSubtitleStream:
    """Metadata for one subtitle stream detected inside a video container."""
    index: int
    codec_name: str
    language: str | None = None
    title: str | None = None


def detect_subtitle_streams(video_path: str) -> list[DetectedSubtitleStream]:
    """
    Detect subtitle streams inside a local video file using ffprobe.
    Logs each detected stream so we can verify embedded vs external in server logs.
    """
    path = Path(video_path)
    if not path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    command = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "s",
        "-show_entries", "stream=index,codec_name:stream_tags=language,title",
        "-of", "json",
        str(path),
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=30,
        check=True,
    )

    data = json.loads(result.stdout or "{}")
    streams = []

    for stream in data.get("streams", []):
        tags = stream.get("tags") or {}
        detected = DetectedSubtitleStream(
            index=stream["index"],
            codec_name=stream.get("codec_name", "unknown"),
            language=tags.get("language"),
            title=tags.get("title"),
        )
        streams.append(detected)
        logger.info(
            "[Subtitles] Embedded stream detected | "
            "video=%s stream_index=%d codec=%s language=%s title=%s",
            path.name,
            detected.index,
            detected.codec_name,
            detected.language or "unknown",
            detected.title or "",
        )

    if not streams:
        logger.info(
            "[Subtitles] No embedded subtitle streams found | video=%s",
            path.name,
        )

    return streams


def extract_subtitle_stream(video_path: str, stream_index: int, output_path: str) -> Path:
    """
    Extract one subtitle stream from a local video file using FFmpeg.

    Uses `-c:s srt` instead of `-c:s copy` so that any container-level
    presentation timestamp offset is stripped during re-encode, preventing
    the subtitle cues from being shifted forward or backward relative to
    the video timeline.
    """
    input_path = Path(video_path)
    if not input_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)

    command = [
        "ffmpeg",
        "-y",
        "-i", str(input_path),
        "-map", f"0:{stream_index}",
        # Original: "-c:s", "copy"
        # Why changed: `-c:s copy` preserves container-level PTS offsets that
        # are present in some MKV files. Those offsets shift every cue's timing
        # by the same amount (often several seconds), causing visible desync.
        # `-c:s srt` forces FFmpeg to re-encode through its SRT muxer which
        # always writes timestamps relative to 0, giving correct cue times.
        "-c:s", "srt",
        str(destination),
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=120,
    )

    if result.returncode != 0:
        logger.error(
            "[Subtitles] FFmpeg extraction failed | "
            "stream_index=%d video=%s stderr=%s",
            stream_index,
            input_path.name,
            result.stderr[-500:] if result.stderr else "",
        )
        raise subprocess.CalledProcessError(result.returncode, command, result.stderr)

    logger.info(
        "[Subtitles] Embedded subtitle extracted | "
        "source=embedded stream_index=%d output=%s size_bytes=%d",
        stream_index,
        destination.name,
        destination.stat().st_size,
    )
    return destination


def convert_srt_to_vtt(input_path: str, output_path: str) -> Path:
    """
    Convert a local SRT subtitle file to WebVTT.

    Fixes applied vs the previous version:
    - Both timestamps on each cue line are converted (start AND end).
    - HTML font/color tags are stripped — browsers silently drop malformed VTT
      cues that contain <font color=...> which shifts all subsequent cue indices.
    - Numeric cue identifiers are preserved (required by the WebVTT spec).
    - Blank lines between cues are normalised to exactly one.
    """
    source = Path(input_path)
    if not source.exists():
        raise FileNotFoundError(f"SRT file not found: {input_path}")

    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)

    content = source.read_text(encoding="utf-8-sig", errors="replace")

    # Normalise line endings
    content = content.replace("\r\n", "\n").replace("\r", "\n")

    # Convert SRT timestamps to VTT on every cue timing line.
    # SRT format:  HH:MM:SS,mmm --> HH:MM:SS,mmm
    # VTT format:  HH:MM:SS.mmm --> HH:MM:SS.mmm
    # The previous regex only targeted the start timestamp, leaving the end
    # timestamp with a comma which some browsers reject as a parse error,
    # causing the cue to be silently dropped and shifting all later cues.
    def fix_timestamp_line(match: re.Match) -> str:
        line = match.group(0)
        return line.replace(",", ".")

    content = re.sub(
        r"^\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}.*$",
        fix_timestamp_line,
        content,
        flags=re.MULTILINE,
    )

    # Strip HTML tags that are invalid in WebVTT and cause parser failures.
    # <font color=...> is the most common culprit in SRT files from the wild.
    # <i>, <b>, <u> are valid WebVTT tags and are preserved.
    content = re.sub(r"<font[^>]*>", "", content, flags=re.IGNORECASE)
    content = re.sub(r"</font>", "", content, flags=re.IGNORECASE)

    # Collapse runs of 3+ blank lines down to 2 (one blank line between cues)
    content = re.sub(r"\n{3,}", "\n\n", content)

    output_text = f"WEBVTT\n\n{content.strip()}\n"
    destination.write_text(output_text, encoding="utf-8")

    logger.info(
        "[Subtitles] SRT converted to WebVTT | input=%s output=%s size_bytes=%d",
        source.name,
        destination.name,
        destination.stat().st_size,
    )
    return destination
