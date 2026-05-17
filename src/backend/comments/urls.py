from django.urls import path
from .views import CommentsView

urlpatterns = [
    path("", CommentsView.as_view()),



]