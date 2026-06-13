from django.db import models
from django.contrib.auth.models import User

LANGUAGE_CHOICES = [("en", "English"), ("fr", "French"), ("es", "Spanish")]

class UserProfile(User):
    profile_picture = models.URLField(blank=True, null=True)
    language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default="en")