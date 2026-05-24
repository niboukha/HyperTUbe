from django.db import models
from apps.movies.models import Movie


class Torrent(models.Model):
    movie = models.OneToOneField(Movie, on_delete=models.CASCADE, related_name='torrent')
    hls_path = models.CharField(max_length=500, null=True, blank=True)

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

    def __str__(self):
        return f"the torrent link is {self.movie.torrent_url} and the id is {self.id}"
    
class Subtitle(models.Model):
    movie       = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='subtitles')
    language    = models.CharField(max_length=10)  # en, fr, ar...
    file_path   = models.CharField(max_length=500)
    source      = models.CharField(max_length=100, null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"the subtitle is {self.language} and the id is {self.id}"
