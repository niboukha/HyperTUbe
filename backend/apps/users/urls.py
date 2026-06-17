from django.urls import path
from .views import (
    register, login_view, profile, set_language,
    password_reset_request, password_reset_confirm,
    logout_view, settings_change_password, upload_avatar,
    UserSearchView, user_profile,
)

urlpatterns = [
    path("register",                  register,                name="register"),
    path("login",                     login_view,              name="login_view"),
    path("logout",                    logout_view,             name="logout_view"),
    path("password-reset",            password_reset_request,  name="password_reset_request"),
    path("password-confirm",          password_reset_confirm,  name="password_reset_confirm"),
    path("settings/change-password",  settings_change_password, name="settings_change_password"),
    path("profile",                   profile,                 name="profile"),
]

user_urlpatterns = [
    path("",              UserSearchView.as_view(), name="user-list"),
    path("<int:pk>/",     user_profile,             name="user-profile"),
    path("profile/avatar",    upload_avatar,  name="upload_avatar"),
    path("profile/language",  set_language,   name="set_language"),
]
