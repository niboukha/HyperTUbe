# users/providers/intra42/views.py

from allauth.socialaccount.providers.oauth2.views import OAuth2LoginView

from .adapter import Intra42OAuth2Adapter
from apps.users.views import JWTOAuth2CallbackView


oauth2_login    = OAuth2LoginView.adapter_view(Intra42OAuth2Adapter)
oauth2_callback = JWTOAuth2CallbackView.adapter_view(Intra42OAuth2Adapter)