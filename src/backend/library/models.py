from django.db import models
from movies.models import Movie
from users.models import UserProfile

# Create your models here.
class UserMovie(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='movies')
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='users')
    saved= models.BooleanField(default=False)
    watched = models.BooleanField(default=False)
    current_time = models.IntegerField(default=0)  # seconds
    last_watched_at = models.DateTimeField(auto_now=False, null=True, blank=True)
    def __str__(self):
        return f"the user id is {self.user} and the movie id is {self.movie}"