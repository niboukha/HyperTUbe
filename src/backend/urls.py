
from django.contrib import admin
from django.urls import path
from django.urls import include

from backend import settings
from django.conf.urls.static import static
from users.views import login_view  # ✅ import FROM users app, not relative
from rest_framework_simplejwt.views import TokenRefreshView  # ✅ add this

from rest_framework_simplejwt.views import TokenObtainPairView

# from .views import LoginView
urlpatterns = [
    # path('admin/', admin.site.urls),
    # path('api/movies/', include('movies.urls')),

    

    path("api/auth/", include("users.urls")),
    
    path("accounts/", include("allauth.urls")), 
    path("accounts/intra42/",include("users.providers.intra42.urls")),
    
    path('oauth/token', login_view, name='login'),  # ← here
    path('oauth/token/refresh', TokenRefreshView.as_view(), name='refresh'),  # optiona

    path('comments/',include("comments.urls")),  # optiona


]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


