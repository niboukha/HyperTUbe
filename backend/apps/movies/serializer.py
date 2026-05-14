from rest_framework import serializers
from .models import Movie


class MovieResultSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()
    year = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    genre = serializers.SerializerMethodField()

    class Meta:
        model = Movie
        fields = [
            "type",
            "id",
            "title",
            "year",
            "rating",
            "poster_path",
            "backdrop_path",
            "overview",
            "release_date",
            "availability",
            "genre",
        ]

    def get_type(self, obj):
        return "movie"

    def get_year(self, obj):
        return obj.release_date.year if obj.release_date else None

    def get_availability(self, obj):
        return "free" if obj.is_watchable else "premium"

    # def get_genre(self, obj):
    #     return list(
    #         obj.moviegenre_set.values_list("genre_id", flat=True)
    #     )
    
    genre = serializers.SerializerMethodField()

    def get_genre(self, obj):
        return [
            g.genre_id for g in obj.moviegenre_set.all()
        ]