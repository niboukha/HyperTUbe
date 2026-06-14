from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('streaming', '0004_torrent_last_accessed_at'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='subtitle',
            constraint=models.UniqueConstraint(
                condition=models.Q(status='ready'),
                fields=['movie', 'language'],
                name='unique_ready_subtitle_per_movie_language',
            ),
        ),
    ]
