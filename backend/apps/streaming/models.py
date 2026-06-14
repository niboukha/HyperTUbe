from django.db import models
from django.utils import timezone
from apps.movies.models import Movie

class Torrent(models.Model):
    movie               = models.OneToOneField(Movie, on_delete=models.CASCADE, related_name='torrent')
    hls_path            = models.CharField(max_length=500, null=True, blank=True)
    video_path          = models.CharField(max_length=500, null=True, blank=True)
    last_accessed_at    = models.DateTimeField(default=timezone.now)

    status      = models.CharField(
    max_length  = 20,
        choices = [
            ('idle',    'Idle'),             # Not downloaded yet
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
    class Source(models.TextChoices):
        EMBEDDED = 'embedded', 'Embedded'
        EXTERNAL = 'external', 'External'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        READY   = 'ready', 'Ready'
        FAILED  = 'failed', 'Failed'

    movie           = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='subtitles')
    language        = models.CharField(max_length=16)
    label           = models.CharField(max_length=64, blank=True)
    source          = models.CharField(max_length=20, choices=Source.choices, default=Source.EMBEDDED)
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    file            = models.FileField(upload_to='subtitles/', blank=True, null=True)
    subtitle_link   = models.URLField(blank=True)
    stream_index    = models.IntegerField(blank=True, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['movie', 'language'],
                condition=models.Q(status='ready'),
                name='unique_ready_subtitle_per_movie_language',
            )
        ]

    def __str__(self):
        return f"the subtitle is {self.language} and the id is {self.id}"
