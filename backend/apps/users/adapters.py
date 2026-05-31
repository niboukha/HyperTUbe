
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.signals import social_account_added, pre_social_login
from django.dispatch import receiver
from apps.users.models import UserProfile
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import redirect
from urllib.parse import urlencode


class SocialAccountAdapter(DefaultSocialAccountAdapter):

    def new_user(self, request, sociallogin):
        print("ADAPTER LOADED")
        return UserProfile()
    def pre_social_login(self, request, sociallogin):
        user = sociallogin.user

        refresh = RefreshToken.for_user(user)

        response = redirect("http://localhost:3000/home")
        print("==>auyhentiacte ADAPTER LOADED",refresh)

        response.set_cookie(
            "access_token",
            str(refresh.access_token),
            httponly=True,
            secure=False,      # True in production HTTPS
            samesite="Lax",
            max_age=3600,
        )
        return response

        # return redirect(
        #     f"http://localhost:3000/auth/callback?{params}"
        # )
# class SocialAccountAdapter(DefaultSocialAccountAdapter):

#     def new_user(self, request, sociallogin):
#         return UserProfile()


# @receiver(pre_social_login)
# def pre_social_login_handler(request, sociallogin, **kwargs):
#     # Already existing user logging in → do nothing
#     if sociallogin.is_existing:
#         return

#     # New user → set username before saving
#     data = sociallogin.account.extra_data
#     user = sociallogin.user
#     user.username = (
#         data.get("login")                        # GitHub
#         or data.get("name", "").replace(" ", "") # Google
#         or f"user_{user.email.split('@')[0] if user.email else 'unknown'}"
#     )
#     user.email = user.email or data.get("email") or ""


    
    #     user = sociallogin.user

    #     refresh = RefreshToken.for_user(user)

    #     params = urlencode({
    #         "access_token": str(refresh.access_token),
    #     })

    #     return redirect(
    #         f"http://localhost:3000/auth/callback?{params}"
    #     )