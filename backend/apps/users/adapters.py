# # yourapp/adapters.py
# from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
# from users.models import UserProfile


# class SocialAccountAdapter(DefaultSocialAccountAdapter):
    
#     def new_user(self, request, sociallogin):
#         # Return a UserProfile instance instead of a plain User
#         return UserProfile()

#     def save_user(self, request, sociallogin, form=None):
#         user = sociallogin.user  # already a UserProfile instance (from new_user)
#         print("=================>sociallogin",sociallogin)
#         if sociallogin.is_existing:
#             return sociallogin.user
#         print("==>user",user,"||",sociallogin.is_existing)
        
#         # Fill in basic fields from the social account data
#         data = sociallogin.account.extra_data
#         user.username = data.get("login") or data.get("name") or ""
#         user.email = sociallogin.user.email or data.get("email", "") or ""
        
#         user.save()
#         return user


# yourapp/adapters.py
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.signals import social_account_added, pre_social_login
from django.dispatch import receiver
from users.models import UserProfile


class SocialAccountAdapter(DefaultSocialAccountAdapter):

    def new_user(self, request, sociallogin):
        return UserProfile()


@receiver(pre_social_login)
def pre_social_login_handler(request, sociallogin, **kwargs):
    # Already existing user logging in → do nothing
    if sociallogin.is_existing:
        return

    # New user → set username before saving
    data = sociallogin.account.extra_data
    user = sociallogin.user
    user.username = (
        data.get("login")                        # GitHub
        or data.get("name", "").replace(" ", "") # Google
        or f"user_{user.email.split('@')[0] if user.email else 'unknown'}"
    )
    user.email = user.email or data.get("email") or ""