from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.views import APIView
from django.db.models import F

from apps.users.models import UserProfile
from .models import Comment, CommentLike


class CommentsView(APIView):

    def get(self, request, id=None):
        liked_ids = set(
            CommentLike.objects
            .filter(user=request.user.userprofile)
            .values_list("comment_id", flat=True)
        )

        # GET /comments/:id — single comment
        if id is not None:
            try:
                c = Comment.objects.get(id=id)
            except Comment.DoesNotExist:
                return Response({"error": "Comment not found"}, status=404)
            return Response({
                "id":         c.id,
                "username":   c.user.username,
                "userId":     c.user.id,
                "comment":    c.content,
                "created_at": c.created_at,
                "stars":      c.stars,
                "likes":      c.likes,
                "isLiked":    c.id in liked_ids,
            })

        # GET /comments/?movie_id=... — comments for a movie
        # GET /comments/              — latest 20 globally
        movie_id = request.query_params.get("movie_id")
        qs = Comment.objects.filter(movieId=movie_id) if movie_id else Comment.objects.all()
        comments = qs.order_by("-created_at")[:20]

        return Response([
            {
                "id":         c.id,
                "username":   c.user.username,
                "userId":     c.user.id,
                "comment":    c.content,
                "created_at": c.created_at,
                "stars":      c.stars,
                "likes":      c.likes,
                "isLiked":    c.id in liked_ids,
            }
            for c in comments
        ])

    def post(self, request):
        movie_id = request.data.get("movie_id")
        content = request.data.get("comment")
        stars = request.data.get("stars", 0)
        user = UserProfile.objects.get(id=request.user.id)
        if not movie_id or not content:
                return Response({"error": "movie_id and comment are required"}, status=400)

        comment = Comment.objects.create(
                movieId=movie_id,
                user=user,
                content=content,
                stars=stars   
        )

        return Response({
                "id": comment.id,
                "username": comment.user.username,
                "comment": comment.content,
                "stars": comment.stars,
                "likes": 0,
                "userId": user.id,
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
            new_content = request.data.get("comment")
            new_stars   = request.data.get("stars")

            if new_content:
                comment.content = new_content
            if new_stars is not None:
                comment.stars = new_stars

            comment.save()

            return Response({
                "id":       comment.id,
                "comment":  comment.content,
                "stars":    comment.stars,
                "username": comment.user.username,
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
