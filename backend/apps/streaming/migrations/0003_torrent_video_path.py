from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('streaming', '0002_subtitle_file_label_source_status_stream_index_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='torrent',
            name='video_path',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]
