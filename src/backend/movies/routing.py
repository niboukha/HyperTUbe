from django.urls import re_path
from movies.consumers import MovieStatusConsumer

websocket_urlpatterns = [
    re_path(r'ws/movies/(?P<movie_id>\d+)/status/$', MovieStatusConsumer.as_asgi()),
]