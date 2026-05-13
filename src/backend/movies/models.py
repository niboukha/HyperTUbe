from django.db import models

# Create your models here.
class Movie(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    rating = models.FloatField(default=0)
    movie_path = models.CharField(max_length=500, null=True, blank=True)
    hls_path = models.CharField(max_length=500, null=True, blank=True)

    production_year = models.IntegerField()
    duration = models.IntegerField(help_text="minutes")

    cover_image = models.URLField()
    torrent_url = models.URLField(blank=True)

    status = models.CharField(
    max_length=20,
        choices=[
            ('idle',    'Idle'),       # Not downloaded yet
            ('downloading','Downloading'),   # Download in progress
            ('processing', 'Processing'),    # MKV → MP4 conversion in progress
            ('ready',      'Ready'),         # Fully downloaded + converted, ready to serve
            ('error',      'Error'),         # Something went wrong
        ],
        default='idle'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    last_watched = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"the movie is {self.title} and the id is {self.id}"

class Subtitle(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='subtitles')
    language = models.CharField(max_length=50)
    subtitle_link = models.URLField()

    def __str__(self):
        return f"the subtitle is {self.language} and the id is {self.id}"
