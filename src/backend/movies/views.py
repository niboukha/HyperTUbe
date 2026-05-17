from django.shortcuts import render

from .serializers import MovieSerializer, SubtitleSerializer
from rest_framework.response import Response
from rest_framework import status
from .models import Movie
from rest_framework.views import APIView
import rest_framework.permissions as permissions
# from .tasks import download_and_convert
from celery_app import app


# Create your views here.
class MovieListView(APIView):
    def get(self, request):
        movies = Movie.objects.all()
        serializer = MovieSerializer(movies, many=True)
        return Response(serializer.data)

class MovieDetailView(APIView):
    # permissions_classes = [permissions.IsAuthenticated]
    def get(self, request, id):
        try:
            movie = Movie.objects.get(id=id)
            serializer = MovieSerializer(movie)
            return Response(serializer.data)
        except Movie.DoesNotExist:
            return Response({'error': 'Movie not found'}, status=404)
        
class MovieStatusView(APIView):
    def get(self, request, id):
        try:
            movie = Movie.objects.get(id=id)

            return Response({'status': movie.status})
        except Movie.DoesNotExist:
            return Response({'error': 'Movie not found'}, status=404)

class WatchMovieView(APIView):
    def post(self, request, id):
        # from .tasks import download_and_convert
        movie = Movie.objects.get(id=id)

        # prevent duplicate Celery jobs
        # if movie.status in ["downloading", "processing", "ready"]:
        # download_and_convert.delay(movie.id)
        app.send_task('movies.tasks.download_and_convert', args=[movie.id])
        return Response({
            "status": movie.status
        })

        # movie.status = "downloading"
        # movie.save()

        return Response({
            "status": movie.status
        })


class MovieStreamView(APIView):

    def get(self, request, id):
        try:
            movie = Movie.objects.get(id=id)
        except Movie.DoesNotExist:
            return Response({'error': 'Movie not found'}, status=404)

        if movie.status != 'ready':
            return Response({'error': 'Movie is not ready yet'}, status=400)

        return Response({
            'hls_url': movie.hls_path
        })

