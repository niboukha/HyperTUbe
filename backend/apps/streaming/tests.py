from django.test import SimpleTestCase

from apps.streaming.subtitles import normalize_subtitle_language
from apps.streaming.tasks import wanted_subtitle_languages


class SubtitleLanguageTests(SimpleTestCase):
    def test_normalizes_common_embedded_language_tags(self):
        self.assertEqual(normalize_subtitle_language('eng'), 'en')
        self.assertEqual(normalize_subtitle_language('fra'), 'fr')
        self.assertEqual(normalize_subtitle_language('fre'), 'fr')
        self.assertEqual(normalize_subtitle_language('ara'), 'ar')

    def test_wanted_languages_is_english_only_while_validating_subtitles(self):
        self.assertEqual(wanted_subtitle_languages('fra'), ['en'])
        self.assertEqual(wanted_subtitle_languages('en-US'), ['en'])

        # Restore this expectation after re-enabling preferred-language subtitles:
        # self.assertEqual(wanted_subtitle_languages('fra'), ['en', 'fr'])
