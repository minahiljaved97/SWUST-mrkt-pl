#!/usr/bin/env bash
# Rollback to a previous release directory.
# Usage:
#   ./deploy/scripts/rollback.sh <release-timestamp>
# Example:
#   ./deploy/scripts/rollback.sh 20260926120000
# List releases:
#   ls -1 /var/www/swust-api/releases

set -euo pipefail

APP_ROOT="/var/www/swust-api"
RELEASES_DIR="${APP_ROOT}/releases"
TARGET="${1:-}"

if [[ -z "${TARGET}" ]]; then
  echo "Usage: $0 <release-timestamp>"
  echo "Available releases:"
  ls -1 "${RELEASES_DIR}" || true
  exit 1
fi

RELEASE_DIR="${RELEASES_DIR}/${TARGET}"
if [[ ! -d "${RELEASE_DIR}/backend" ]]; then
  echo "Release not found: ${RELEASE_DIR}"
  exit 1
fi

echo "==> Rolling back to ${RELEASE_DIR}"
ln -sfn "${RELEASE_DIR}" "${APP_ROOT}/current"
sudo systemctl restart gunicorn
sudo systemctl is-active --quiet gunicorn
curl -fsS "https://api.example.com/api/v1/health/" >/dev/null
echo "==> Rollback complete. current -> $(readlink -f "${APP_ROOT}/current")"
