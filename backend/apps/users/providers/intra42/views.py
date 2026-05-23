# users/providers/intra42/views.py

import requests
from allauth.socialaccount.providers.oauth2.views import (
    OAuth2Adapter,
    OAuth2LoginView,
    OAuth2CallbackView,
)

from .adapter import Intra42OAuth2Adapter



oauth2_login    = OAuth2LoginView.adapter_view(Intra42OAuth2Adapter)
oauth2_callback = OAuth2CallbackView.adapter_view(Intra42OAuth2Adapter)