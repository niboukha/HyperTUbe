import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
# A shortcut for creating classes that only store data.
class DetectedSubtitleStream:
    """Metadata for one subtitle stream detected inside a video container."""

    index: int
    codec_name: str
    language: str | None = None
    title: str | None = None


def detect_subtitle_streams(video_path: str) -> list[DetectedSubtitleStream]:
    """
    Detect subtitle streams inside a local video file using ffprobe.
    """
    path = Path(video_path)
    if not path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    command = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "s",
        "-show_entries",
        "stream=index,codec_name:stream_tags=language,title",
        "-of",
        "json",
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
        streams.append(
            DetectedSubtitleStream(
                index=stream["index"],
                codec_name=stream.get("codec_name", "unknown"),
                language=tags.get("language"),
                title=tags.get("title"),
            )
        )

    return streams


def extract_subtitle_stream(video_path: str, stream_index: int, output_path: str) -> Path:
    """
    Extract one subtitle stream from a local video file using FFmpeg.
    """
    input_path = Path(video_path)
    if not input_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)

    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-map",
        f"0:{stream_index}",
        "-c:s",
        "copy",
        str(destination),
    ]

    subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=120,
        check=True,
    )

    return destination


def convert_srt_to_vtt(input_path: str, output_path: str) -> Path:
    """
    Convert a local SRT subtitle file to WebVTT.
    """
    source = Path(input_path)
    if not source.exists():
        raise FileNotFoundError(f"SRT file not found: {input_path}")

    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)

    content = source.read_text(encoding="utf-8-sig")
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    content = re.sub(r"(?m)^(\d{2}:\d{2}:\d{2}),(\d{3})", r"\1.\2", content)
    content = re.sub(r"(?m)(-->\s*\d{2}:\d{2}:\d{2}),(\d{3})", r"\1.\2", content)

    destination.write_text(f"WEBVTT\n\n{content.strip()}\n", encoding="utf-8")
    return destination
