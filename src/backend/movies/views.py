from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.http import StreamingHttpResponse, FileResponse
from django.utils import timezone
from .models import Movie
from . import hls
from .tasks import download_and_segment
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
            # hls_dir = hls.get_movie_hls_dir(movie_id)
            # file_path = os.path.join(hls_dir, filename)
            movie_path = movie.movie_path
            # hls_path = movie.hls_path

            # ============================================================
            # REQUEST FOR PLAYLIST
            # ============================================================
            # if filename == 'playlist.m3u8':

                # CASE 1: File exists on disk
            if movie_path and os.path.exists(movie_path) and movie.status == 'ready':

                # CASE 1a: Already MP4 → generate HLS if not exists, serve
                if movie_path.endswith('.mp4'):
                    return Response({
                        'movie_path': movie_path,
                        'status': 'ready',
                    }, status=200)
                else :
                    hls_path = hls.generate_hls_from_file(movie_id, movie_path)
                    movie.hls_path = hls_path
                    movie.save(update_fields=['hls_path'])
                    return Response({
                        'movie_path': hls_path,
                        'status': 'ready',
                    }, status=200)

            elif movie_path and os.path.exists(movie_path) and movie.status == 'converting':
                return Response({
                    'movie_path': hls_path,
                    'status': movie.status,
                }, status=200)
            
            else:
                os.makedirs(os.path.join('/media/movies/', str(movie_id)), exist_ok=True)
                download_and_segment.delay(movie_id)
                print(f"Started download task for movie {movie_id}, HLS path: {hls_path}")
                return Response({
                    # 'movie_path': hls_path,
                    'movie_path': movie.hls_path,  # Return movie dir for client to poll for playlist
                    'status': movie.status,
                }, status=200)

        except Movie.DoesNotExist:
            print(f"==============> Movie with id {movie_id} not found")
            return Response({'error': 'Movie not found'}, status=404)
        except Exception as e:
            print(f"==============>Error in MovieStreamView: {e}")
            return Response({'error': 'An error occurred'}, status=500)
            

    # def serve_file(self, file_path, content_type):
    #     """Serve a file directly"""
    #     response = FileResponse(
    #         open(file_path, 'rb'),
    #         content_type=content_type
    #     )
    #     response['Cache-Control'] = 'no-cache'
    #     return response