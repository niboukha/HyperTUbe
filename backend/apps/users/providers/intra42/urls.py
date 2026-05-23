from .views import Intra42OAuth2Adapter
from allauth.socialaccount.providers.oauth2.views import OAuth2LoginView, OAuth2CallbackView
from django.urls import path

urlpatterns = [
    path(
        "login/",
        OAuth2LoginView.adapter_view(Intra42OAuth2Adapter),
        name="intra42_login",
    ),
    path(
        "login/callback/",
        OAuth2CallbackView.adapter_view(Intra42OAuth2Adapter),
        name="intra42_callback",
    ),
]