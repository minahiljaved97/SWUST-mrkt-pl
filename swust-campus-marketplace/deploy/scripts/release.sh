#!/usr/bin/env bash
# Safe release helper for EC2 (run as deploy user).
# Usage:
#   ./deploy/scripts/release.sh <git-ref>
# Example:
#   ./deploy/scripts/release.sh master
#   HEALTH_URL=https://api.example.com/api/v1/health/ ./deploy/scripts/release.sh master
#
# Expects directory layout:
#   /var/www/swust-api/repo                          — git clone of SWUST-mrkt-pl
#   /var/www/swust-api/repo/swust-campus-marketplace — app source synced into releases
#   /var/www/swust-api/releases/                     — timestamped releases
#   /var/www/swust-api/current                       — symlink to active release
#   /etc/swust-api/env                               — production environment file
#
# Does not print or echo secret values.

set -euo pipefail

REF="${1:-master}"
APP_ROOT="/var/www/swust-api"
REPO_DIR="${APP_ROOT}/repo"
# This monorepo keeps the app under swust-campus-marketplace/
APP_SRC="${REPO_DIR}/swust-campus-marketplace"
RELEASES_DIR="${APP_ROOT}/releases"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="${RELEASES_DIR}/${TIMESTAMP}"
BACKEND_DIR="${RELEASE_DIR}/backend"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
HEALTH_URL="${HEALTH_URL:-https://api.example.com/api/v1/health/}"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "Missing git clone at ${REPO_DIR}"
  exit 1
fi

if [[ ! -d "${APP_SRC}/backend" ]]; then
  echo "Missing app at ${APP_SRC} (expected swust-campus-marketplace/backend)"
  exit 1
fi

echo "==> Fetching ${REF}"
git -C "${REPO_DIR}" fetch --all --tags --prune
git -C "${REPO_DIR}" checkout --force "${REF}"
git -C "${REPO_DIR}" reset --hard "origin/${REF}" 2>/dev/null || git -C "${REPO_DIR}" reset --hard "${REF}"

echo "==> Creating release ${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"
rsync -a --delete \
  --exclude '.git' \
  --exclude 'backend/.venv' \
  --exclude 'backend/media' \
  --exclude 'backend/staticfiles' \
  --exclude 'backend/.env' \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/dist' \
  "${APP_SRC}/" "${RELEASE_DIR}/"

echo "==> Python venv + dependencies"
python3 -m venv "${BACKEND_DIR}/.venv"
# shellcheck disable=SC1091
source "${BACKEND_DIR}/.venv/bin/activate"
pip install --upgrade pip
pip install -r "${BACKEND_DIR}/requirements.txt"

echo "==> Migrations + collectstatic"
set -a
# shellcheck disable=SC1091
source /etc/swust-api/env
set +a
cd "${BACKEND_DIR}"
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py check --deploy

echo "==> Activate release"
ln -sfn "${RELEASE_DIR}" "${APP_ROOT}/current"
sudo systemctl restart gunicorn
sudo systemctl is-active --quiet gunicorn
curl -fsS "${HEALTH_URL}" >/dev/null

echo "==> Prune old releases (keep ${KEEP_RELEASES})"
# shellcheck disable=SC2012
ls -1dt "${RELEASES_DIR}"/* | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf

echo "==> Release ${TIMESTAMP} live"
