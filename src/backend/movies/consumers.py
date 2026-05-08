import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class MovieStatusConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.movie_id  = int(self.scope['url_route']['kwargs']['movie_id'])
        self.group_name = f'movie_{self.movie_id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        print(f'[WS] Connected movie {self.movie_id}')

        movie = await self.get_movie()
        if not movie:
            await self.send(text_data=json.dumps({'status': 'error'}))
            await self.close()
            return

        if movie.status == 'ready' and movie.hls_path:
            await self.send(text_data=json.dumps({
                'status': 'ready',
                'hls_path': movie.hls_path,
            }))
            return

        if movie.status in ['downloading', 'processing']:
            await self.send(text_data=json.dumps({
                'status': movie.status,
            }))
            return

        await self.set_movie_status('downloading')
        await self.send(text_data=json.dumps({'status': 'downloading'}))

        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, self._start_celery_task)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

        # ✅ Kill FFmpeg and clean segments on disconnect
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, self._cleanup_on_disconnect)
        print(f'[WS] Disconnected movie {self.movie_id}')

    async def receive(self, text_data):
        data   = json.loads(text_data)
        action = data.get('action')
        print(f'[WS] Action: {action}')

        # ✅ User seeks to new position
        if action == 'seek':
            position = data.get('position', 0)
            print(f'[WS] Seek to {position}s for movie {self.movie_id}')

            loop = asyncio.get_event_loop()
            loop.run_in_executor(
                None,
                self._segment_from_position,
                position
            )

            await self.send(text_data=json.dumps({
                'status': 'processing',
                'message': f'Segmenting from {position}s'
            }))

    async def movie_status_update(self, event):
        await self.send(text_data=json.dumps({
            'status': event['status'],
            'hls_path': event.get('hls_path'),
        }))

    def _start_celery_task(self):
        try:
            from movies.tasks import download_and_convert
            result = download_and_convert.delay(self.movie_id)
            print(f'[WS] Celery task: {result.id} ✅')
        except Exception as e:
            print(f'[WS] Celery FAILED: {e}')

    def _segment_from_position(self, position):
        """
        Called when user seeks — re-segment from new position
        """
        try:
            from movies.tasks import segment_portion
            segment_portion(
                movie_id=self.movie_id,
                start_seconds=position,
                duration=120    # segment 2 minutes ahead
            )
        except Exception as e:
            print(f'[WS] Segment failed: {e}')

    def _cleanup_on_disconnect(self):
        """
        Kill FFmpeg and clean segments when user leaves
        """
        try:
            from movies.tasks import active_ffmpeg, _clean_segments
            from movies.models import Movie
            from django.utils import timezone

            # Kill FFmpeg process
            if self.movie_id in active_ffmpeg:
                active_ffmpeg[self.movie_id].kill()
                active_ffmpeg.pop(self.movie_id, None)
                print(f'[WS] FFmpeg killed for movie {self.movie_id}')

            # Clean segments
            hls_dir = f'/www/media/hls/{self.movie_id}'
            _clean_segments(hls_dir)

            # Update last watched
            Movie.objects.filter(id=self.movie_id).update(
                hls_path=None,
                last_watched=timezone.now()
            )
        except Exception as e:
            print(f'[WS] Cleanup failed: {e}')

    @database_sync_to_async
    def get_movie(self):
        from movies.models import Movie
        try:
            return Movie.objects.get(id=self.movie_id)
        except Movie.DoesNotExist:
            return None

    @database_sync_to_async
    def set_movie_status(self, status):
        from movies.models import Movie
        Movie.objects.filter(id=self.movie_id).update(status=status)