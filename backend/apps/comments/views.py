from urllib import request

from django.shortcuts import render
from rest_framework.response import Response
from apps.users.models import UserProfile
from apps.movies.models import Movie
from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from django.shortcuts import redirect
from rest_framework.permissions import AllowAny
from django.db.models import F

from django.contrib.auth.models import User
from rest_framework.views import APIView
from .models import Comment
from .models import CommentLike

from rest_framework.permissions import IsAuthenticated  # ← change this




# @api_view(["GET", "POST", "PATCH", "DELETE"])
class CommentsView(APIView):
    
    def get(self, request,id):
        
        comments = Comment.objects.filter(movieId=id).order_by("-created_at")
        # if request.user.id==comments.user.id:
        isLiked =False
        comments_likes = CommentLike.objects.filter(user=request.user.userprofile)
        liked_comment_ids = set(
            CommentLike.objects
            .filter(user=request.user.userprofile)
            .values_list('comment_id', flat=True)
        )

        data = [
            {
                "id": c.id,
                "username": c.user.user.username if hasattr(c.user, "user") else c.user.username,
                "userId": c.user.id,
                "content": c.content,
                "created_at": c.created_at,
                "stars" :c.stars,
                "likes" :c.likes,
                "isLiked":c.id in liked_comment_ids, 

            }
            for c in comments
        ]

        return Response(data)

    def post(self, request):
        movie_id = request.data.get("movie_id")
        content = request.data.get("content")
        stars = request.data.get("stars", 0)
        user = UserProfile.objects.get(id=request.user.id)
        if not movie_id or not content:
                return Response({"error": "there is missing data"}, status=400)
        
        comment = Comment.objects.create(
                movieId=movie_id,
                user=user,   # or UserProfile if you use that
                content=content,
                stars=stars
               
        ) 
        return Response({
                "id": comment.id,
                "username": comment.user.username,
                "content": comment.content,
                "stars": comment.stars,
                "likes": 0,
                "isLiked": False,
                "created_at": comment.created_at,
            }, status=201
            )
    
    def delete(self, request, id):
        try:
            comment = Comment.objects.get(id=id)

            if comment.user != request.user.userprofile:
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
        
    def patch(self,request,id):
        try:
            comment = Comment.objects.get(id=id)
            if comment.user != request.user.userprofile:   # ✅ fixed comparison
                return Response(
                    {"error": "Not allowed"},
                    status=status.HTTP_403_FORBIDDEN
                )
            new_content = request.data.get("content")
            new_stars = request.data.get("stars")
            new_username = request.data.get("username")

            if new_content:
                comment.content = new_content
            if new_stars:
                comment.stars = new_stars
        
            comment.save()   # ✅ was missing — content and stars never saved
            
            return Response({
                "message": "Comment updated successfully",
                "content": comment.content,
                "stars": comment.stars,
                "username": comment.user.userprofile.username,
            }, status=status.HTTP_200_OK)

            
            
           
            

        except Comment.DoesNotExist:
            return Response(
                {"error": "Comment not found"},
                status=status.HTTP_404_NOT_FOUND
            )


@api_view(["POST"])
# @permission_classes([IsAuthenticated])  # ← not AllowAny
def comments_likes(request,id):
    try:
      
        user = request.user.userprofile
        comment = Comment.objects.get(id=id)

        like_obj = CommentLike.objects.filter(user=user, comment=comment)
        if like_obj.exists():
            like_obj.delete()
            Comment.objects.filter(id=id).update(likes=F("likes") - 1)

            return Response({
                "message": "comment unliked",
                "isLiked": False
            })

        else:
            CommentLike.objects.create(user=user, comment=comment)
            Comment.objects.filter(id=id).update(likes=F("likes") + 1)

            return Response({
                "message": "comment liked",
                "isLiked": True
            })

    except Comment.DoesNotExist:
        return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)
