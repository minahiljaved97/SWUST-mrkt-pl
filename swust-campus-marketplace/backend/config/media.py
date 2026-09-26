"""Media URL helpers that work with local filesystem and S3/CDN URLs."""


def absolute_media_url(request, url: str | None) -> str | None:
    if not url:
        return None
    if url.startswith(("http://", "https://")):
        return url
    if request is not None:
        return request.build_absolute_uri(url)
    return url
