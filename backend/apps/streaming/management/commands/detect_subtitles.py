from django.core.management.base import BaseCommand, CommandError
from apps.streaming.subtitles import detect_subtitle_streams

class Command(BaseCommand):
    help = "Detect subtitle streams inside a local video file using ffprobe."

    def add_arguments(self, parser):
        parser.add_argument("video_path", help="Path to the local video file")

    def handle(self, *args, **options):
        video_path = options["video_path"]

        try:
            streams = detect_subtitle_streams(video_path)
        except FileNotFoundError as exc:
            raise CommandError(str(exc)) from exc
        except Exception as exc:
            raise CommandError(f"ffprobe subtitle detection failed: {exc}") from exc

        if not streams:
            self.stdout.write("No subtitle streams detected.")
            return

        for stream in streams:
            self.stdout.write(
                "stream_index={index} codec={codec} language={language} title={title}".format(
                    index=stream.index,
                    codec=stream.codec_name,
                    language=stream.language or "unknown",
                    title=stream.title or "",
                )
            )
