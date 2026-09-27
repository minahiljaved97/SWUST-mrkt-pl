from .base import *  # noqa: F403
from .env import env, env_bool, env_list, env_required, database_config

DEBUG = False
SECRET_KEY = env_required("SECRET_KEY")
if len(SECRET_KEY) < 50:
    raise ValueError(
        "SECRET_KEY must be at least 50 characters in production."
    )

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
    raise ValueError("ALLOWED_HOSTS must be set in production.")

DATABASES = {"default": database_config(env_required("DATABASE_URL"))}
if DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":
    raise ValueError("Production DATABASE_URL must use PostgreSQL.")

# Optional TLS for managed Postgres (DATABASE_SSLMODE=require).
_sslmode = env("DATABASE_SSLMODE")
if _sslmode:
    DATABASES["default"].setdefault("OPTIONS", {})
    DATABASES["default"]["OPTIONS"]["sslmode"] = _sslmode

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS")
if not CORS_ALLOWED_ORIGINS:
    raise ValueError("CORS_ALLOWED_ORIGINS must be set in production.")

# Optional: e.g. ^https://.*\\.vercel\\.app$
CORS_ALLOWED_ORIGIN_REGEXES = env_list("CORS_ALLOWED_ORIGIN_REGEXES")

CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")
if not CSRF_TRUSTED_ORIGINS:
    raise ValueError("CSRF_TRUSTED_ORIGINS must be set in production.")

CORS_ALLOW_CREDENTIALS = env_bool("CORS_ALLOW_CREDENTIALS", True)

USE_X_FORWARDED_HOST = env_bool("USE_X_FORWARDED_HOST", True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_HSTS_SECONDS = int(env("SECURE_HSTS_SECONDS", "31536000") or "31536000")
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

_jwt_key = env("JWT_SIGNING_KEY")
if _jwt_key:
    SIMPLE_JWT = {  # noqa: F405
        **SIMPLE_JWT,  # noqa: F405
        "SIGNING_KEY": _jwt_key,
    }

_use_s3 = env_bool("USE_S3_MEDIA", False)
if _use_s3:
    _bucket = env_required("AWS_STORAGE_BUCKET_NAME")
    AWS_STORAGE_BUCKET_NAME = _bucket
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", "us-east-1") or "us-east-1"
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
    AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL") or None
    AWS_S3_CUSTOM_DOMAIN = env("AWS_S3_CUSTOM_DOMAIN") or None
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = env_bool("AWS_QUERYSTRING_AUTH", False)
    AWS_S3_OBJECT_PARAMETERS = {
        "CacheControl": "max-age=86400",
    }
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_SIGNATURE_VERSION = env("AWS_S3_SIGNATURE_VERSION", "s3v4") or "s3v4"

    _media_location = (env("AWS_MEDIA_LOCATION", "media") or "media").strip("/")
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "bucket_name": AWS_STORAGE_BUCKET_NAME,
                "location": _media_location,
                "default_acl": AWS_DEFAULT_ACL,
                "querystring_auth": AWS_QUERYSTRING_AUTH,
                "file_overwrite": AWS_S3_FILE_OVERWRITE,
                "object_parameters": AWS_S3_OBJECT_PARAMETERS,
                "region_name": AWS_S3_REGION_NAME,
                "signature_version": AWS_S3_SIGNATURE_VERSION,
                **(
                    {"endpoint_url": AWS_S3_ENDPOINT_URL}
                    if AWS_S3_ENDPOINT_URL
                    else {}
                ),
                **(
                    {"custom_domain": AWS_S3_CUSTOM_DOMAIN}
                    if AWS_S3_CUSTOM_DOMAIN
                    else {}
                ),
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
        },
    }
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/{_media_location}/"
    elif AWS_S3_ENDPOINT_URL:
        MEDIA_URL = (
            f"{AWS_S3_ENDPOINT_URL.rstrip('/')}/"
            f"{AWS_STORAGE_BUCKET_NAME}/{_media_location}/"
        )
    else:
        MEDIA_URL = (
            f"https://{AWS_STORAGE_BUCKET_NAME}.s3."
            f"{AWS_S3_REGION_NAME}.amazonaws.com/{_media_location}/"
        )
    SERVE_MEDIA = False
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
        },
    }
    SERVE_MEDIA = env_bool("SERVE_MEDIA", False)

SPECTACULAR_SETTINGS = {
    **SPECTACULAR_SETTINGS,  # noqa: F405
    "SERVE_PERMISSIONS": ["accounts.permissions.IsAdmin"],
}

LOG_LEVEL = (env("LOG_LEVEL", "INFO") or "INFO").upper()
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "gunicorn.error": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "gunicorn.access": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
