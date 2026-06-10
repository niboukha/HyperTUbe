from django.urls import path
from . import views

urlpatterns = [
    path("movies/",                                views.movies_list),
    path("movies/runtime/",                        views.movies_runtime_batch),
    path("movies/collection/<int:collection_id>/", views.movie_collection),
    path("movies/<str:movie_id>/",                 views.movie_detail),
    path("movies/<str:movie_id>/trailer/",         views.movie_trailer),
    path("search/",                                views.movie_search),
    path("watchlist/",                             views.watchlist_list),
    path("watchlist/toggle/",                      views.watchlist_toggle),
]