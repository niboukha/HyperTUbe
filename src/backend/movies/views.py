from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.http import StreamingHttpResponse, FileResponse
from django.utils import timezone
from .models import Movie
from .tasks import  download_and_segment
import os


class MovieStreamView(APIView):
    """
    HLS Streaming endpoint

    GET /api/hls/{movie_id}/playlist.m3u8  → Return HLS playlist
    GET /api/hls/{movie_id}/{segment}.ts   → Return .ts segment

    Logic:
    1. Movie downloaded + .mp4    → Generate HLS + serve playlist
    2. Movie downloaded + .mkv    → Convert (Celery) + serve when ready
    3. Not downloaded             → Start download (Celery) + serve partial HLS
    4. Path in DB but file missing → Reset + re-trigger download
    """
    # permission_classes = [IsAuthenticated]

    def get(self, request, movie_id):
        """
        Serve HLS playlist or segment
        filename = 'playlist.m3u8' or 'segment0.ts', 'segment1.ts' etc.
        """
        try:
            movie = get_object_or_404(Movie, id=movie_id)
            if movie.status == "ready":
                return Response({'status': 'ready', 'movie_path': movie.hls_path})

            if movie.status not in ["downloading", "processing", 'error']:
                download_and_segment.delay(movie.id)
            return Response({'status': movie.status, 'movie_path': None})
            
        except Movie.DoesNotExist:
            print(f"==============> Movie with id {movie_id} not found")
            return Response({'status': 'error', 'message': 'Movie not found'}, status=404)
        except Exception as e:
            print(f"==============>Error in MovieStreamView: {e}")
            return Response({'status': 'error', 'message': 'An error occurred'}, status=500)
            

    # def serve_file(self, file_path, content_type):
    #     """Serve a file directly"""
    #     response = FileResponse(
    #         open(file_path, 'rb'),
    #         content_type=content_type
    #     )
    #     response['Cache-Control'] = 'no-cache'
    #     return response