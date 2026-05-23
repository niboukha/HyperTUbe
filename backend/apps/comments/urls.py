from django.urls import path
from .views import CommentsView,comments_likes

urlpatterns = [
    path("<str:id>/like", comments_likes,name="comments_likes"),
    path("<str:id>/", CommentsView.as_view()),
    path("", CommentsView.as_view()),
]