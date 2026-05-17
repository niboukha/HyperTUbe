from django.db import models
from movies.models import Movie

# Create your models here.
class DownloadTask(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='download_tasks')
    status = models.CharField(
        max_length=50,
        choices=[
            ('downloading', 'downloading'),
            ('paused', 'paused'),
            ('completed', 'completed'),
            ('error', 'error')
        ],
        default='downloading'
    )
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"DownloadTask for {self.movie} - Status: {self.status}"