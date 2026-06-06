from django.contrib import admin
from .models import Subtitle, Torrent


@admin.register(Torrent)
class TorrentAdmin(admin.ModelAdmin):
    list_display = ("id", "movie", "status", "video_path", "hls_path", "last_accessed_at")
    list_filter = ("status", "last_accessed_at")
    search_fields = ("movie__title", "movie__tmdb_id", "video_path", "hls_path")


@admin.register(Subtitle)
class SubtitleAdmin(admin.ModelAdmin):
    list_display = ("id", "movie", "language", "label", "source", "status", "stream_index", "file")
    list_filter = ("status", "source", "language")
    search_fields = ("movie__title", "movie__tmdb_id", "language", "label", "subtitle_link", "file")
