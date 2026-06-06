import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('streaming', '0003_torrent_video_path'),
    ]

    operations = [
        migrations.AddField(
            model_name='torrent',
            name='last_accessed_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
