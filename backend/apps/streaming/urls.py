from django.urls import path, include
from .views import MovieStreamView

urlpatterns = [
    path('<int:movie_id>/stream/', MovieStreamView.as_view(), name='movie-stream'),
    #  path('', views.MovieListView.as_view(), name='movie-list'),
    # path('<int:id>/', views.MovieDetailView.as_view(), name='movie-detail'),
    # path('<int:id>/watch/', views.WatchMovieView.as_view(), name='movie-watch'),

    # path('<int:id>/status/', views.MovieStatusView.as_view(), name='movie-status'),
    # path('<int:id>/subtitles/', views.MovieSubtitlesView.as_view(), name='movie-subtitles'),
    # path('search/', views.MovieSearchView.as_view(), name='movie-search'),
] 