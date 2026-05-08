from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class UserProfile(User):
    # user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_picture = models.URLField(blank=True, null=True)