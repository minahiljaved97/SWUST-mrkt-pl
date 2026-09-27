#!/usr/bin/env bash
# First-time EC2 bootstrap for SWUST API (Ubuntu 24.04).
# Run as ubuntu after SSH:
#   bash bootstrap-ec2.sh
#
# Stops before DATABASE_URL so you paste it with: sudo nano /etc/swust-api/env
# Does not print secret values.

set -euo pipefail

APP_ROOT="/var/www/swust-api"
REPO_URL="https://github.com/minahiljaved97/SWUST-mrkt-pl.git"
BRANCH="master"
EC2_IP="3.26.65.149"

echo "[1/5] Installing packages..."
sudo apt update
sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt install -y \
  python3 python3-venv python3-pip python3-dev \
  build-essential libpq-dev \
  nginx git curl rsync ufw \
  certbot python3-certbot-nginx

python3 --version
git --version
nginx -v

echo "[2/5] Creating deploy user and directories..."
if ! id deploy >/dev/null 2>&1; then
  sudo adduser --disabled-password --gecos "" deploy
fi

sudo mkdir -p "${APP_ROOT}/repo" "${APP_ROOT}/releases" /var/log/swust-api /etc/swust-api /var/www/certbot
sudo chown -R deploy:deploy "${APP_ROOT}" /var/log/swust-api
sudo chown root:deploy /etc/swust-api
sudo chmod 750 /etc/swust-api

echo 'deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart gunicorn, /bin/systemctl reload nginx, /bin/systemctl daemon-reload, /bin/systemctl is-active *gunicorn*, /usr/sbin/nginx' | \
  sudo tee /etc/sudoers.d/swust-deploy >/dev/null
sudo chmod 440 /etc/sudoers.d/swust-deploy

echo "[3/5] Cloning repository and creating release..."
if [[ ! -d "${APP_ROOT}/repo/.git" ]]; then
  sudo -u deploy git clone "${REPO_URL}" "${APP_ROOT}/repo"
fi
sudo -u deploy git -C "${APP_ROOT}/repo" fetch --all --prune
sudo -u deploy git -C "${APP_ROOT}/repo" checkout -B "${BRANCH}" "origin/${BRANCH}"

APP_SRC="${APP_ROOT}/repo/swust-campus-marketplace"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="${APP_ROOT}/releases/${TIMESTAMP}"
sudo -u deploy mkdir -p "${RELEASE_DIR}"
sudo -u deploy rsync -a --delete \
  --exclude '.git' \
  --exclude 'backend/.venv' \
  --exclude 'backend/media' \
  --exclude 'backend/staticfiles' \
  --exclude 'backend/.env' \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/dist' \
  "${APP_SRC}/" "${RELEASE_DIR}/"
sudo -u deploy ln -sfn "${RELEASE_DIR}" "${APP_ROOT}/current"

echo "[4/5] Creating venv and installing requirements..."
BACKEND="${APP_ROOT}/current/backend"
sudo -u deploy python3 -m venv "${BACKEND}/.venv"
sudo -u deploy bash -lc "source '${BACKEND}/.venv/bin/activate' && pip install --upgrade pip && pip install -r '${BACKEND}/requirements.txt'"

echo "[5/5] Writing /etc/swust-api/env placeholders (no DATABASE_URL yet)..."
SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')"
JWT_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')"

sudo tee /etc/swust-api/env >/dev/null <<EOF
DJANGO_SETTINGS_MODULE=config.settings.production
DEBUG=false
SECRET_KEY=${SECRET_KEY}
ALLOWED_HOSTS=${EC2_IP},localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOWED_ORIGIN_REGEXES=
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOW_CREDENTIALS=true

# PASTE your Supabase URI on the next line (URL-encode & as %26)
DATABASE_URL=
DATABASE_SSLMODE=require

SECURE_SSL_REDIRECT=false
USE_X_FORWARDED_HOST=true
SECURE_HSTS_SECONDS=0
LOG_LEVEL=INFO

JWT_SIGNING_KEY=${JWT_KEY}
JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=7
ALLOWED_EMAIL_DOMAINS=mails.swust.edu.cn,swust.edu.cn
TIME_ZONE=Asia/Shanghai

USE_S3_MEDIA=false
SERVE_MEDIA=true

GUNICORN_BIND=127.0.0.1:8000
GUNICORN_WORKERS=2
GUNICORN_THREADS=2
GUNICORN_TIMEOUT=60
EOF
sudo chown root:deploy /etc/swust-api/env
sudo chmod 640 /etc/swust-api/env

echo
echo "=== STOP: set DATABASE_URL on the server ==="
echo "  sudo nano /etc/swust-api/env"
echo "Fill DATABASE_URL=postgresql://postgres:...@db....supabase.co:5432/postgres"
echo "Save (Ctrl+O Enter, Ctrl+X), then tell Cursor to continue."
echo "Release: ${RELEASE_DIR}"
