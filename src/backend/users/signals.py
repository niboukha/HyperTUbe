# # users/signals.py
# from allauth.socialaccount.signals import social_account_updated, pre_social_login
# from django.dispatch import receiver
# from rest_framework_simplejwt.tokens import RefreshToken

# @receiver(pre_social_login)
# def generate_jwt_after_social_login(sender, request, sociallogin, **kwargs):
#     user = sociallogin.user

#     if user.pk is None:
#         return  # user not saved yet, skip

#     refresh = RefreshToken.for_user(user)

#     # store tokens in session temporarily
#     # we'll set the cookie in the callback view
#     request.session["access_token"]  = str(refresh.access_token)
#     request.session["refresh_token"] = str(refresh)