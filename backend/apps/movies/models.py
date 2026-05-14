from django.db import models
from django.contrib.auth.models import User

class Movie(models.Model):
    tmdb_id = models.IntegerField(unique=True)

    title = models.CharField(max_length=255)
    overview = models.TextField(blank=True, null=True)

    poster_url = models.URLField(blank=True, null=True)
    backdrop_url = models.URLField(blank=True, null=True)

    release_date = models.DateField(null=True, blank=True)

    rating = models.FloatField(default=0)

    duration = models.IntegerField(null=True, blank=True)

    is_watchable = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
    

class VideoSource(models.Model):
    PROVIDER_CHOICES = (
        ("archive", "Archive.org"),
        ("torrent", "Legit Torrents"),
    )

    movie = models.ForeignKey(
        Movie,
        on_delete=models.CASCADE,
        related_name="sources"
    )

    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)

    external_id = models.CharField(max_length=255)

    video_url = models.URLField()

    thumbnail_url = models.URLField(blank=True, null=True)

    quality = models.CharField(max_length=20, blank=True, null=True)

    language = models.CharField(max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.movie.title} - {self.provider}"


class UserMovieState(models.Model):
    STATUS_CHOICES = (
        ("watching", "Watching"),
        ("completed", "Completed"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    movie = models.ForeignKey("Movie", on_delete=models.CASCADE)

    is_saved = models.BooleanField(default=False)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        null=True,
        blank=True
    )

    progress = models.FloatField(default=0)  # percentage of the movie watched

    last_watched_at = models.DateTimeField(null=True, blank=True)

    # created_at = models.DateTimeField(auto_now_add=True)

    # updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "movie")


class Genre(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class MovieGenre(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    genre = models.ForeignKey(Genre, on_delete=models.CASCADE)
