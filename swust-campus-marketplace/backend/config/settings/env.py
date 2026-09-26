import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

load_dotenv(BASE_DIR / ".env")


def env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name, default)
    return value


def env_required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def database_config(database_url: str) -> dict:
    if not database_url or database_url.startswith("sqlite"):
        db_name = BASE_DIR / "db.sqlite3"
        if database_url.startswith("sqlite:///"):
            path = database_url.removeprefix("sqlite:///")
            db_name = Path(path) if Path(path).is_absolute() else BASE_DIR / path
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": db_name,
        }

    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgres", "postgresql", "pgsql"}:
        raise ValueError(
            "DATABASE_URL must be a postgres:// or sqlite:/// URL."
        )

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parsed.path.lstrip("/")),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or 5432),
        "CONN_MAX_AGE": 60,
        "OPTIONS": {"connect_timeout": 10},
    }
