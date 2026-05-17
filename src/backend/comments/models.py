from django.db import models
from django.contrib.auth.models import User
from movies.models import Movie
from users.models import UserProfile

class Comment(models.Model):
    movieId = models.TextField()  # Store the movie ID as a string
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='comments')

    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    likes = models.IntegerField(default=0)
    dislikes = models.IntegerField(default=0)





