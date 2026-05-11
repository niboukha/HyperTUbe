from django.urls import path
from . import views

urlpatterns = [
    path("movies/",              views.movies_home),
    path("library/",             views.library),
    path("movies/<str:movie_id>/stream/", views.stream),
]
