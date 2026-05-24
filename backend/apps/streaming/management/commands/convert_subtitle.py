from django.core.management.base import BaseCommand, CommandError
from apps.streaming.subtitles import convert_srt_to_vtt

class Command(BaseCommand):
    help = "Convert a local SRT subtitle file to WebVTT."

    def add_arguments(self, parser):
        parser.add_argument("input_path", help="Path to the local .srt file")
        parser.add_argument("output_path", help="Output .vtt file path")

    def handle(self, *args, **options):
        try:
            output_path = convert_srt_to_vtt(
                input_path=options["input_path"],
                output_path=options["output_path"],
            )
        except FileNotFoundError as exc:
            raise CommandError(str(exc)) from exc
        except UnicodeDecodeError as exc:
            raise CommandError(f"SRT file must be UTF-8 encoded: {exc}") from exc
        except Exception as exc:
            raise CommandError(f"SRT to WebVTT conversion failed: {exc}") from exc

        self.stdout.write(f"Converted subtitle to: {output_path}")
