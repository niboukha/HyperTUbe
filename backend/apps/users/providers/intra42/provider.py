from allauth.socialaccount.providers.oauth2.provider import OAuth2Provider
from allauth.socialaccount.providers.base import ProviderAccount
from .adapter import Intra42OAuth2Adapter


class Intra42Account(ProviderAccount):
    def to_str(self):
        return self.account.extra_data.get("login", "")


class Intra42Provider(OAuth2Provider):
    id = "intra42"
    name = "42"
    oauth2_adapter_class = Intra42OAuth2Adapter

    def get_default_scope(self):
        return ["public"]

    def extract_uid(self, data):
        return str(data["id"])
        
    def extract_common_fields(self, data):
        return {
            "username": data.get("login", ""),
            "email": data.get("email", ""),
            "first_name": data.get("first_name", ""),
            "last_name": data.get("last_name", ""),
        }


provider_classes = [Intra42Provider]