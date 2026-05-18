from django.urls import path
from .views import CommentsView

urlpatterns = [
    path("<str:id>/", CommentsView.as_view()),
    path("", CommentsView.as_view()),
]