from rest_framework import serializers
from .models import Movie

class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = [
            'id',
            'title',
            'description',
            'rating',
            'production_year',
            'duration',
            'cover_image',
            'status',
            'subtitles',
            'created_at', 
        ]

class SubtitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie

        fields = [
            'id',
            'subtitle_link',
            'language'
        ]