#!/bin/sh
set -eu

echo "Waiting for database..."
python <<'PY'
import os
import time
from urllib.parse import urlparse

import psycopg

url = os.environ.get("DATABASE_URL", "")
parsed = urlparse(url)
if parsed.scheme not in {"postgres", "postgresql", "pgsql"}:
    raise SystemExit("DATABASE_URL must be PostgreSQL in this entrypoint.")

conninfo = (
    f"dbname={parsed.path.lstrip('/')} "
    f"user={parsed.username or ''} "
    f"password={parsed.password or ''} "
    f"host={parsed.hostname or 'localhost'} "
    f"port={parsed.port or 5432}"
)
sslmode = os.environ.get("DATABASE_SSLMODE")
if sslmode:
    conninfo += f" sslmode={sslmode}"

for attempt in range(30):
    try:
        with psycopg.connect(conninfo, connect_timeout=3) as conn:
            conn.execute("SELECT 1")
        break
    except Exception as exc:  # noqa: BLE001
        print(f"DB not ready ({attempt + 1}/30): {exc}")
        time.sleep(2)
else:
    raise SystemExit("Database did not become ready in time.")
PY

python manage.py migrate --noinput
python manage.py collectstatic --noinput
exec gunicorn config.wsgi:application --config gunicorn.conf.py
