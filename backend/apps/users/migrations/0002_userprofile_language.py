from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='language',
            field=models.CharField(
                choices=[('en', 'English'), ('fr', 'French'), ('es', 'Spanish')],
                default='en',
                max_length=10,
            ),
        ),
    ]
