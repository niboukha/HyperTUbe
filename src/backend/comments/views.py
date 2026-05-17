from django.shortcuts import render
from rest_framework.response import Response
from users.models import UserProfile
from movies.models import Movie
from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from django.shortcuts import redirect
from rest_framework.permissions import AllowAny

from django.contrib.auth.models import User
from rest_framework.views import APIView
from .models import Comment



# @api_view(["GET", "POST", "PATCH", "DELETE"])
class CommentsView(APIView):
    
    def get(self, request):
        comments = Comment.objects.all().order_by("-created_at")
        data = [
            {
                "id": c.id,
                "username": c.user.user.username if hasattr(c.user, "user") else c.user.username,
                "content": c.content,
                "created_at": c.created_at,
            }
            for c in comments
        ]

        return Response(data)

    def post(self, request):
        movie_id = request.data.get("movie_id")
        content = request.data.get("content")

        user = UserProfile.objects.get(id=request.user.id)
        if not movie_id or not content:
                return Response({"error": "there is missing data"}, status=400)
        # movie = Movie.objects.get(id=movie_id)
        comment = Comment.objects.create(
                movieId=movie_id,
                user=user,   # or UserProfile if you use that
                content=content,
               
        ) 
        return Response({"message": "comment created"}, status=201)
    
    def delete(self, request, id):
        try:
            comment = Comment.objects.get(id=id)

            # optional: only allow owner to delete
            if comment.user != request.user:
                return Response(
                    {"error": "Not allowed"},
                    status=status.HTTP_403_FORBIDDEN
                )

            comment.delete()

            return Response(
                {"message": "Comment deleted"},
                status=status.HTTP_200_OK
            )

        except Comment.DoesNotExist:
            return Response(
                {"error": "Comment not found"},
                status=status.HTTP_404_NOT_FOUND
            )