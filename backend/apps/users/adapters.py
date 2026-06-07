from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.signals import  pre_social_login
from django.dispatch import receiver
from apps.users.models import UserProfile
import random
import string
from django.contrib.auth.models import User


class SocialAccountAdapter(DefaultSocialAccountAdapter):

    def new_user(self, request, sociallogin):
        return UserProfile()

def generate_unique_username(base):
    username = base
    while User.objects.filter(username=username).exists():
        suffix = ''.join(random.choices(string.digits, k=4))
        username = f"{base}{suffix}"
    return username

@receiver(pre_social_login)
def pre_social_login_handler(request, sociallogin, **kwargs):
    # Already existing user logging in → do nothing
    if sociallogin.is_existing:
        return

    # New user → set username before saving
    data = sociallogin.account.extra_data
    user = sociallogin.user

    print("====data thta came fro, socia auth",user),
    print("====extra data thta came fro, socia auth",data),


    base_username = (
        data.get("login")                        # GitHub / 42 login
        or data.get("name", "").replace(" ", "") # Google, etc.
        or f"user_{user.email.split('@')[0] if user.email else 'unknown'}"
    )

    # Assign a unique username
    user.username = generate_unique_username(base_username)

    # from google => picture family_name firstname ===given_name

    user.email = user.email or data.get("email") or ""
    user.save()
    return user