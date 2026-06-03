from django.urls import path
from .views import oauth2_login, oauth2_callback

urlpatterns = [
    path("login/", oauth2_login, name="intra42_login"),
    path("login/callback/", oauth2_callback, name="intra42_callback"),
]