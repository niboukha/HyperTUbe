
import requests
from allauth.socialaccount.providers.oauth2.views import OAuth2Adapter
import os

class Intra42OAuth2Adapter(OAuth2Adapter):
    provider_id = "intra42"

    access_token_url = "https://api.intra.42.fr/oauth/token"
    authorize_url    = "https://api.intra.42.fr/oauth/authorize"
    profile_url      = "https://api.intra.42.fr/v2/me"
    def get_callback_url(self, request, app):
        url = os.getenv("INTRA_CALLBACK")
        return "http://localhost:8000/accounts/intra42/login/callback/"

        
    def complete_login(self, request, app, token, **kwargs):
        resp = requests.get(
            self.profile_url,
            headers={"Authorization": f"Bearer {token.token}"},
        )
        resp.raise_for_status()
        extra_data = resp.json()
        login = self.get_provider().sociallogin_from_response(request, extra_data)


        return login