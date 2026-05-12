from django.urls import path
from . import views

urlpatterns = [
    path("movies/",              views.movies_list),
    path("movies/<str:movie_id>/", views.movie_detail),
]
