import requests
from django.core.management.base import BaseCommand
from movies.models import Movie, Subtitle


class Command(BaseCommand):
    help = 'Fetch 10 movies from archive.org and seed the database with subtitles'

    ARCHIVE_API = "https://archive.org/advancedsearch.php"

    # Map file extensions/names to language names
    LANGUAGE_MAP = {
        'en': 'English',
        'fr': 'French',
        'es': 'Spanish',
        'de': 'German',
        'ar': 'Arabic',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'zh': 'Chinese',
        'ja': 'Japanese',
    }

    def handle(self, *args, **kwargs):
        if Movie.objects.exists():
            self.stdout.write(self.style.WARNING(
                f'Database already has {Movie.objects.count()} movies. Skipping seed.'
            ))
        return

        self.stdout.write('Fetching movies from archive.org...')
        self.stdout.write('Fetching movies from archive.org...')

        params = {
            'q': 'mediatype:movies AND subject:feature film',
            'fl[]': ['identifier', 'title', 'description', 'year', 'runtime', 'avg_rating'],
            'rows': 30,
            'page': 1,
            'output': 'json',
            'sort[]': 'downloads desc',
        }

        try:
            response = requests.get(self.ARCHIVE_API, params=params, timeout=10)
            response.raise_for_status()
            docs = response.json()['response']['docs']
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to fetch: {e}'))
            return

        count = 0

        for doc in docs:
            if count >= 10:
                break

            identifier = doc.get('identifier')
            if not identifier:
                continue

            # Fetch metadata and files for this item
            meta_url = f"https://archive.org/metadata/{identifier}"
            try:
                meta = requests.get(meta_url, timeout=10).json()
                files = meta.get('files', [])
            except Exception:
                continue

            # Find torrent, cover image and subtitles
            torrent_url  = ''
            cover_image  = ''
            subtitle_files = []

            for f in files:
                name = f.get('name', '')

                if name.endswith('.torrent') and not torrent_url:
                    torrent_url = f"https://archive.org/download/{identifier}/{name}"

                if name.endswith(('.jpg', '.png')) and not cover_image:
                    cover_image = f"https://archive.org/download/{identifier}/{name}"

                # Collect subtitle files (.srt or .vtt)
                if name.endswith(('.srt', '.vtt')):
                    subtitle_url = f"https://archive.org/download/{identifier}/{name}"
                    language = self._detect_language(name)
                    subtitle_files.append({
                        'url': subtitle_url,
                        'language': language,
                    })

            # Skip if missing essential data
            if not torrent_url or not cover_image:
                continue

            title       = doc.get('title', 'Unknown Title')
            description = doc.get('description', 'No description available.')
            year        = doc.get('year', 2000)
            rating      = float(doc.get('avg_rating', 0) or 0)

            raw_runtime = str(doc.get('runtime', '90'))
            duration    = int(''.join(filter(str.isdigit, raw_runtime)) or 90)

            if Movie.objects.filter(title=title).exists():
                self.stdout.write(f'  Skipping (exists): {title}')
                continue

            try:
                year = int(str(year)[:4])
            except (ValueError, TypeError):
                year = 2000

            movie = Movie.objects.create(
                title=title,
                description=description if isinstance(description, str) else description[0],
                rating=round(rating, 1),
                production_year=year,
                duration=duration,
                cover_image=cover_image,
                torrent_url=torrent_url,
                # status='ready',
            )

            count += 1
            self.stdout.write(self.style.SUCCESS(f'  [{count}] Created: {title} ({year})'))

            # Seed subtitles for this movie
            if subtitle_files:
                seen_languages = set()
                for sub in subtitle_files:
                    # avoid duplicate languages per movie
                    if sub['language'] in seen_languages:
                        continue
                    seen_languages.add(sub['language'])

                    Subtitle.objects.create(
                        movie=movie,
                        language=sub['language'],
                        subtitle_link=sub['url'],
                    )
                    self.stdout.write(f'      + Subtitle: {sub["language"]}')
            else:
                self.stdout.write(f'      No subtitles found for: {title}')

        self.stdout.write(self.style.SUCCESS(f'\nDone! {count} movies seeded.'))

    def _detect_language(self, filename):
        """
        Try to detect language from filename.
        Examples: movie.en.srt, movie.fr.vtt, subtitles_english.srt
        """
        name_lower = filename.lower()

        # Check short codes first (e.g. .en.srt)
        for code, language in self.LANGUAGE_MAP.items():
            if f'.{code}.' in name_lower or f'_{code}.' in name_lower:
                return language

        # Check full language names in filename
        for code, language in self.LANGUAGE_MAP.items():
            if language.lower() in name_lower:
                return language

        # Default fallback
        return 'English'
