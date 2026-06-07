# # # users/signals.py

from django.db.models.signals import post_save
from django.contrib.auth.models import User
from django.dispatch import receiver

from allauth.account.signals import user_signed_up
# from django.dispatch import receiver
from .models import UserProfile


@receiver(user_signed_up)
def create_user_profile(request, user, **kwargs):
    """
    Allauth creates a User row but NOT the child UserProfile row.
    This signal fires right after signup (including OAuth) and creates it.
    """
    if not UserProfile.objects.filter(user_ptr_id=user.pk).exists():
        UserProfile.objects.create(user_ptr_id=user.pk)