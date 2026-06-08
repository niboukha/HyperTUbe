from django.urls import path, include
from .views import (
    MovieHLSFileView,
    MovieStreamView,
    MovieStreamingResolveView,
    MovieSubtitleFileView,
    MovieSubtitlesView,
)

urlpatterns = [
    path('resolve/<str:movie_ref>/', MovieStreamingResolveView.as_view(), name='movie-streaming-resolve'),
    path('<int:movie_id>/stream/', MovieStreamView.as_view(), name='movie-stream'),
    path('<int:movie_id>/hls/<str:filename>', MovieHLSFileView.as_view(), name='movie-hls-file'),
    path('<int:movie_id>/subtitles/', MovieSubtitlesView.as_view(), name='movie-subtitles'),

    path('<int:movie_id>/subtitles/<int:subtitle_id>/file/', MovieSubtitleFileView.as_view(), name='movie-subtitle-file'),
    #  path('', views.MovieListView.as_view(), name='movie-list'),
    # path('<int:id>/', views.MovieDetailView.as_view(), name='movie-detail'),
    # path('<int:id>/watch/', views.WatchMovieView.as_view(), name='movie-watch'),

    # path('<int:id>/status/', views.MovieStatusView.as_view(), name='movie-status'),
    # path('<int:id>/subtitles/', views.MovieSubtitlesView.as_view(), name='movie-subtitles'),
    # path('search/', views.MovieSearchView.as_view(), name='movie-search'),
] 
