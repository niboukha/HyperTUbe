# backend/celery.py  (same folder as settings.py)
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks([
    'movies', 
    'users',
    'comments',
    'downloads',
    'library',
])
