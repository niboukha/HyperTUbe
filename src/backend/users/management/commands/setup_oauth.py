from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp
import os

class Command(BaseCommand):
    def handle(self, *args, **kwargs):

        site, _ = Site.objects.get_or_create(
            id=1,
            defaults={"domain": "localhost:8000", "name": "localhost"}
        )

        def create_app(provider, name, client_id, secret):
            app, created = SocialApp.objects.get_or_create(
                provider=provider,
                defaults={
                    "name": name,
                    "client_id": client_id,
                    "secret": secret
                }
            )

            if not created:
                # update instead of duplicate creation
                app.name = name
                app.client_id = client_id
                app.secret = secret
                app.save()

            app.sites.add(site)

        create_app(
            "google",
            "google",
            os.getenv("GOOGLE_CLIENT_ID"),
            os.getenv("GOOGLE_CLIENT_SECRET")
        )

        create_app(
            "github",
            "github",
            os.getenv("GITHUB_CLIENT_ID"),
            os.getenv("GITHUB_CLIENT_SECRET")
        )
        create_app(
            "intra42",
            "42",
            os.getenv("INTRA_CLIENT_ID"),
            os.getenv("INTRA_CLIENT_SECRET")
        )