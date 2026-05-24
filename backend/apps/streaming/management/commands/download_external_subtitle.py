from django.core.management.base import BaseCommand, CommandError

from apps.streaming.external_subtitles import (
    SubtitleProviderError,
    download_external_subtitle_fallback,
)


class Command(BaseCommand):
    help = "Download an external subtitle from OpenSubtitles only if no ready subtitle exists."

    def add_arguments(self, parser):
        parser.add_argument("movie_id", type=int)
        parser.add_argument("language", help="Subtitle language code, for example en or fr")

    def handle(self, *args, **options):
        try:
            subtitle = download_external_subtitle_fallback(
                movie_id=options["movie_id"],
                language=options["language"],
            )
        except SubtitleProviderError as exc:
            raise CommandError(str(exc)) from exc
        except Exception as exc:
            raise CommandError(f"External subtitle download failed: {exc}") from exc

        if subtitle is None:
            self.stdout.write("No external subtitle found.")
            return

        self.stdout.write(
            f"Subtitle ready: id={subtitle.id} language={subtitle.language} file={subtitle.file.name}"
        )
