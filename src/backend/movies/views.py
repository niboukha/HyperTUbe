import os

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import  Movie, Torrent

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
        from .tasks import download_and_segment
        try:
            movie = Movie.objects.get(id=movie_id)
            try:
                torrent = Torrent.objects.get(movie=movie)
            except Torrent.DoesNotExist:
                torrent = Torrent.objects.create(movie=movie, status='idle')

            if torrent.status == "ready":
                Movie.objects.update(last_watched=timezone.now())
                return Response({'status': 'ready', 'movie_path': os.path.exists(torrent.hls_path) and torrent.hls_path or None})

            if torrent.status not in ["downloading", "processing", 'error']:
                download_and_segment.delay(movie_id)
            return Response({'status': torrent.status, 'movie_path': None})
            
        except Torrent.DoesNotExist:
            print(f"==============> Torrent with movie_id {movie_id} not found")
            # torrent = Torrent.objects.create(movie=movie)
            return Response({'status': 'error', 'message': 'Torrent not found'}, status=204)
        except Exception as e:
            print(f"==============>Error in MovieStreamView: {e}")
            return Response({'status': 'error', 'message': 'An error occurred'}, status=500)
            