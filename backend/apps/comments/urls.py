from django.urls import path
from .views import CommentsView, comments_likes

urlpatterns = [
    path("",              CommentsView.as_view(),  name="comments-list"),
    path("<int:id>/",     CommentsView.as_view(),  name="comment-detail"),
    path("<int:id>/like", comments_likes,          name="comment-like"),
]