#!/usr/bin/env bash
# Seed demo users + listings. Safe to run from any directory.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"

if [[ ! -f "$BACKEND/manage.py" ]]; then
  echo "Could not find backend at $BACKEND" >&2
  exit 1
fi

cd "$BACKEND"

if [[ -x "$BACKEND/.venv/bin/python" ]]; then
  PYTHON="$BACKEND/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON="python3"
else
  echo "No Python found. Create a venv in backend/ first." >&2
  exit 1
fi

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.development}"

"$PYTHON" manage.py migrate --noinput
"$PYTHON" manage.py seed_categories
"$PYTHON" manage.py seed_demo
