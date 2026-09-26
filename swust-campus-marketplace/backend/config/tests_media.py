from django.test import SimpleTestCase

from config.media import absolute_media_url


class AbsoluteMediaUrlTests(SimpleTestCase):
    def test_passthrough_absolute_https(self):
        url = "https://cdn.example.com/media/listings/a.jpg"
        self.assertEqual(absolute_media_url(None, url), url)

    def test_relative_with_request(self):
        class Req:
            def build_absolute_uri(self, path):
                return f"https://api.example.com{path}"

        self.assertEqual(
            absolute_media_url(Req(), "/media/listings/a.jpg"),
            "https://api.example.com/media/listings/a.jpg",
        )

    def test_none(self):
        self.assertIsNone(absolute_media_url(None, None))
