
class MovieStreamView(APIView):
    """
    HLS Streaming endpoint

    GET /streaming/{movie_id}/stream/  → Return stream status + HLS playlist URL when ready

    Logic:
    1. Movie downloaded + HLS exists  → return ready + playlist URL
    2. Movie being downloaded         → return current status
    3. Not started                    → trigger download task + return downloading status
    4. Stale ready state              → reset + re-trigger download
    """

    def get(self, request, movie_id):
        from .tasks import download_and_segment
        try:
            try:
                movie = Movie.objects.get(id=movie_id)
            except Movie.DoesNotExist:
                logger.warning("Movie %s does not exist", movie_id)
                return Response({'detail': 'Movie not found'}, status=404)

            try:
                torrent = Torrent.objects.get(movie=movie)
            except Torrent.DoesNotExist:
                torrent = Torrent.objects.create(movie=movie, status='idle')
                print(f'[Streaming] Created torrent row for movie={movie_id}')

            torrent.last_accessed_at = timezone.now()
            torrent.save(update_fields=['last_accessed_at'])

            has_subs = movie.subtitles.exists()
            print(f'[Streaming] Movie {movie_id} | torrent_status={torrent.status} | has_subtitles={has_subs}')

            if torrent.status == "ready":
                hls_exists = bool(torrent.hls_path and os.path.exists(torrent.hls_path))
                video_exists = bool(torrent.video_path and os.path.exists(torrent.video_path))

                # if not hls_exists:
                #     print(
                #         '[Streaming] Stale ready torrent detected; media files are missing. '
                #         f'movie_id={movie_id} hls_path={torrent.hls_path} video_path={torrent.video_path}'
                #     )
                #     torrent.status = 'idle'
                #     torrent.hls_path = None
                #     if not video_exists:
                #         torrent.video_path = None
                #     torrent.save(update_fields=['status', 'hls_path', 'video_path'])
                # else:
                    # Stream is ready — trigger subtitle preparation if not already done.
                    # enqueue_subtitle_preparation_once has its own dedup lock so calling
                    # it here on every status poll is safe and does not flood Celery.
                if hls_exists:
                    from .tasks import enqueue_subtitle_preparation_once
                    enqueue_subtitle_preparation_once(
                        movie_id,
                        user_language=preferred_subtitle_language(request),
                        video_path=torrent.video_path if video_exists else None,
                    )

                return Response({'status': 'ready', 'movie_path': os.path.exists(torrent.hls_path) and torrent.hls_path or None})

                # return Response({
                #     'status': 'ready',
                #     'movie_path': request.build_absolute_uri(
                #         f'/streaming/{movie.id}/hls/playlist.m3u8'
                #     ),
                # })
            
                
            if torrent.status not in ["downloading", "processing", 'error']:
                has_subs = movie.subtitles.exists()
                ready_subs = movie.subtitles.filter(status='ready').count()
                
                print(f'[Streaming] Triggering download | movie_id={movie_id} | torrent_status={torrent.status} | subtitles_exist={has_subs} | ready_subtitles={ready_subs}')

                download_and_segment.delay(movie_id)

            # if torrent.status not in ["downloading", "processing", 'error']:

            return Response({'status': torrent.status, 'movie_path': None})

        except Exception as e:
            print(f'[Streaming] Unexpected error | movie_id={movie_id} error={e}')
            return Response({'status': 'error', 'message': 'An error occurred'}, status=500)

