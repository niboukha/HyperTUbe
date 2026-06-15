from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from apps.users.models import UserProfile
import random
import string
from django.contrib.auth.models import User


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def new_user(self, request, sociallogin):
        return UserProfile()

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        base = (
            data.get("username")
            or data.get("login")
            or data.get("name", "").replace(" ", "")
            or (user.email.split("@")[0] if user.email else "user")
        )
        user.username = generate_unique_username(base)
        extra = sociallogin.account.extra_data
        user.profile_picture = (
            extra.get("picture")
            or (extra.get("image") or {}).get("link")
            or extra.get("avatar_url")
        )
        return user

    def is_auto_signup_allowed(self, request, sociallogin):
        return True

def generate_unique_username(base):
    username = base
    while User.objects.filter(username=username).exists():
        suffix = ''.join(random.choices(string.digits, k=4))
        username = f"{base}{suffix}"
    return username


