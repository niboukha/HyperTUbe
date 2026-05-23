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
from rest_framework_simplejwt.views import TokenRefreshView  # ✅ add this

from rest_framework_simplejwt.views import TokenObtainPairView
from apps.users.views import login_view  # ✅ import FROM users app, not relative


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.movies.urls')),
    path("api/auth/", include("apps.users.urls")),
    
    path("accounts/", include("allauth.urls")), 
    path("accounts/intra42/",include("apps.users.providers.intra42.urls")),
    
    path('oauth/token', login_view, name='login'),  # ← here
    path('oauth/token/refresh', TokenRefreshView.as_view(), name='refresh'),  # optiona

    path('comments/',include("apps.comments.urls")),  # optiona
]





if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

