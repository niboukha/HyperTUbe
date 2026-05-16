from django.urls import path
from . import views

urlpatterns = [
    path("movies/",                                views.movies_list),
    path("movies/stream/",                         views.library_search_stream),
    path("movies/runtime/",                        views.movies_runtime_batch),
    path("movies/collection/<int:collection_id>/", views.movie_collection),
    path("movies/<str:movie_id>/",                 views.movie_detail),
    path("movies/<str:movie_id>/trailer/",         views.movie_trailer),
    path("search/",                                views.movie_search),
]
