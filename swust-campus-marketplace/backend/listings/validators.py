from django.core.exceptions import ValidationError
from django.template.defaultfilters import filesizeformat


ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

# 5 MiB per image
MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024


def validate_image_upload(uploaded_file):
    size = getattr(uploaded_file, "size", None)
    if size is not None and size > MAX_IMAGE_UPLOAD_BYTES:
        raise ValidationError(
            f"Image must be {filesizeformat(MAX_IMAGE_UPLOAD_BYTES)} or smaller."
        )

    name = (getattr(uploaded_file, "name", "") or "").lower()
    if "." in name:
        extension = f".{name.rsplit('.', 1)[-1]}"
        if extension not in ALLOWED_IMAGE_EXTENSIONS:
            raise ValidationError(
                "Unsupported image type. Allowed: JPEG, PNG, WebP, GIF."
            )

    content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
    if content_type and content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValidationError(
            "Unsupported image content type. Allowed: JPEG, PNG, WebP, GIF."
        )
