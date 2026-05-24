import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('streaming', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='subtitle',
            name='language',
            field=models.CharField(max_length=16),
        ),
        migrations.AlterField(
            model_name='subtitle',
            name='subtitle_link',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='subtitle',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='subtitle',
            name='file',
            field=models.FileField(blank=True, null=True, upload_to='subtitles/'),
        ),
        migrations.AddField(
            model_name='subtitle',
            name='label',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name='subtitle',
            name='source',
            field=models.CharField(choices=[('embedded', 'Embedded'), ('external', 'External')], default='embedded', max_length=20),
        ),
        migrations.AddField(
            model_name='subtitle',
            name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('ready', 'Ready'), ('failed', 'Failed')], default='pending', max_length=20),
        ),
        migrations.AddField(
            model_name='subtitle',
            name='stream_index',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
