"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

from django.conf.urls.static import static
from django.conf import settings
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import JWTOAuth2CallbackView, login_view
from apps.users.urls import urlpatterns as auth_urlpatterns, user_urlpatterns
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter



urlpatterns = [
    path('admin/', admin.site.urls),
    
    path('', include('apps.movies.urls')),

    path("auth/",  include(auth_urlpatterns)),
    path("users/", include(user_urlpatterns)),

    # Custom JWT callbacks — must be registered BEFORE allauth.urls
    path("accounts/google/login/callback/", JWTOAuth2CallbackView.adapter_view(GoogleOAuth2Adapter)),
    path("accounts/github/login/callback/", JWTOAuth2CallbackView.adapter_view(GitHubOAuth2Adapter)),

    path("accounts/", include("allauth.urls")),
    path("accounts/intra42/", include("apps.users.providers.intra42.urls")),

    path('oauth/token', login_view, name='login'),
    path('oauth/token/refresh', TokenRefreshView.as_view(), name='refresh'),
    
    path('streaming/', include('apps.streaming.urls')),
    
    path('comments/', include("apps.comments.urls")),
    path('streaming/', include("apps.streaming.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
