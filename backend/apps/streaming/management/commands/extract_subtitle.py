from django.core.management.base import BaseCommand, CommandError
from apps.streaming.subtitles import extract_subtitle_stream

class Command(BaseCommand):
    help = "Extract one subtitle stream from a local video file using FFmpeg."

    def add_arguments(self, parser):
        parser.add_argument("video_path", help="Path to the local video file")
        parser.add_argument("stream_index", type=int, help="Subtitle stream index from ffprobe")
        parser.add_argument("output_path", help="Output subtitle file path, for example /tmp/subs/en.srt")

    def handle(self, *args, **options):
        try:
            output_path = extract_subtitle_stream(
                video_path=options["video_path"],
                stream_index=options["stream_index"],
                output_path=options["output_path"],
            )
        except FileNotFoundError as exc:
            raise CommandError(str(exc)) from exc
        except Exception as exc:
            raise CommandError(f"FFmpeg subtitle extraction failed: {exc}") from exc

        self.stdout.write(f"Extracted subtitle to: {output_path}")
