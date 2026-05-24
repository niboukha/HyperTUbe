from django.core.management.base import BaseCommand

from apps.streaming.tasks import prepare_subtitles_for_movie


class Command(BaseCommand):
    help = "Enqueue asynchronous subtitle preparation for a movie."

    def add_arguments(self, parser):
        parser.add_argument("movie_id", type=int)
        parser.add_argument("--language", dest="user_language", default=None)
        parser.add_argument("--video-path", dest="video_path", default=None)

    def handle(self, *args, **options):
        result = prepare_subtitles_for_movie.delay(
            options["movie_id"],
            user_language=options["user_language"],
            video_path=options["video_path"],
        )

        self.stdout.write(f"Subtitle preparation queued: task_id={result.id}")
