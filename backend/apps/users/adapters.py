from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth.models import User
from apps.users.models import UserProfile
import requests
import random
import string


class SocialAccountAdapter(DefaultSocialAccountAdapter):

    def get_email(self, sociallogin):
        if sociallogin.email_addresses:
            return sociallogin.email_addresses[0].email.lower()

        email = sociallogin.account.extra_data.get("email")
        if email:
            return email.lower()

        if sociallogin.user.email:
            return sociallogin.user.email.lower()

        return None

    def get_github_email(self, sociallogin):
        """Call GitHub /user/emails endpoint to get private email."""
        try:
            token = sociallogin.token.token
            resp = requests.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github+json",
                }
            )
            emails = resp.json()
            for e in emails:
                if e.get("primary") and e.get("verified"):
                    return e["email"].lower()
        except Exception as ex:
            print("github email fetch error:", ex)
        return None

    def resolve_email(self, sociallogin):
        """Get email from any provider."""
        email = self.get_email(sociallogin)

        if not email and sociallogin.account.provider == 'github':
            email = self.get_github_email(sociallogin)

        return email

    def pre_social_login(self, request, sociallogin):
        if sociallogin.is_existing:
            return

        email = self.resolve_email(sociallogin)
        if not email:
            return

        # Set email on user object so it's available later
        if not sociallogin.user.email:
            sociallogin.user.email = email

        try:
            existing_user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return

        sociallogin.connect(request, existing_user)

    def new_user(self, request, sociallogin):
        return UserProfile()

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)

        # Existing user — don't touch their data
        if user.pk:
            return user

        # If email still missing (GitHub private), set it manually
        if not user.email:
            user.email = self.resolve_email(sociallogin) or ""

        # Handle GitHub name splitting (only has full name, no last name)
        if sociallogin.account.provider == 'github':
            full_name = sociallogin.account.extra_data.get("name", "") or ""
            parts = full_name.strip().split(" ", 1)
            user.first_name = parts[0] if parts else ""
            user.last_name = parts[1] if len(parts) > 1 else ""

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