from django.conf import settings
from rest_framework import serializers


def get_allowed_email_domains() -> list[str]:
    domains = getattr(settings, "ALLOWED_EMAIL_DOMAINS", []) or []
    return [domain.strip().lower() for domain in domains if domain.strip()]


def validate_swust_email(email: str) -> str:
    """Ensure the email belongs to a configured SWUST domain."""
    normalized = (email or "").strip().lower()
    if "@" not in normalized:
        raise serializers.ValidationError("Enter a valid email address.")

    domain = normalized.rsplit("@", 1)[-1]
    allowed = get_allowed_email_domains()
    if not allowed:
        raise serializers.ValidationError(
            "Registration is temporarily unavailable: no allowed email domains are configured."
        )
    if domain not in allowed:
        allowed_display = ", ".join(allowed)
        raise serializers.ValidationError(
            f"Registration is limited to SWUST email addresses ({allowed_display})."
        )
    return normalized
