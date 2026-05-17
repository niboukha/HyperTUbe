from django.urls import path
from .views import register, login_view, user_list,social_login_callback,password_reset_request,password_reset_confirm,logout_view,settings_change_password

urlpatterns = [
    path("register", register, name="register"),
    path("login", login_view, name="login_view"),
    path("logout", logout_view, name="logout_view"),
    path("password-reset", password_reset_request,name="password_reset_request"),
    path("password-confirm", password_reset_confirm,name="password_reset_confirm"),
    path("settings/change-password", settings_change_password,name="settings_change_password"),

    
    path("users", user_list, name="user_list"),
    path("social/callback/",social_login_callback, name="social_login_callback"),

]