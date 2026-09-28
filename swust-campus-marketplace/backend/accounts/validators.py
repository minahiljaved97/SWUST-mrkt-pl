from django.conf import settings
from rest_framework import serializers


def get_allowed_email_domains() -> list[str]:
    domains = getattr(settings, "ALLOWED_EMAIL_DOMAINS", []) or []
    return [domain.strip().lower() for domain in domains if domain.strip()]


def validate_registration_email(email: str) -> str:
    normalized = (email or "").strip().lower()
    if "@" not in normalized:
        raise serializers.ValidationError("Enter a valid email address.")

    allowed = get_allowed_email_domains()
    # Empty list or "*" means any email domain is allowed.
    if not allowed or "*" in allowed:
        return normalized

    domain = normalized.rsplit("@", 1)[-1]
    if domain not in allowed:
        allowed_display = ", ".join(allowed)
        raise serializers.ValidationError(
            f"Registration is limited to these email domains: {allowed_display}."
        )
    return normalized


# Backwards-compatible alias
validate_swust_email = validate_registration_email
