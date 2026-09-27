# EC2 Deployment Guide — Django REST API

Beginner-friendly guide to run **only the Django API** on an AWS EC2 Linux server so that:

`https://api.example.com`

serves this API. The React app stays on **Vercel** and is **not** deployed here.

```
Internet → Vercel (React) —HTTPS API→ Nginx (EC2) → Gunicorn → Django
                                              ├→ PostgreSQL (Supabase free / RDS)
                                              └→ Media (Supabase Storage / S3 / EC2 disk)
```

Free-tier walkthrough: [`QUICKSTART_DEPLOY.md`](QUICKSTART_DEPLOY.md).

Templates used by this guide live under `deploy/`:

| File | Purpose |
| --- | --- |
| `deploy/systemd/gunicorn.service` | systemd unit (auto-restart) |
| `deploy/nginx/api.example.com.conf` | Nginx reverse proxy + TLS |
| `deploy/env/production.env.example` | Env var checklist (no real secrets) |
| `deploy/scripts/release.sh` | Git-based release |
| `deploy/scripts/rollback.sh` | Point `current` at a previous release |

**Never commit or paste real passwords, keys, or tokens into chat, git, or screenshots.**

Replace `api.example.com` with your real API hostname everywhere.

---

## 0. What you need before starting

- An AWS account
- A domain name you control (example: `api.example.com`)
- Your project in a Git host (GitHub/GitLab)
- A Vercel frontend URL (example: `https://your-app.vercel.app`) for CORS
- Optional but recommended: Amazon RDS for PostgreSQL, Amazon S3 for media

Local Docker (`docker compose`) is for smoke tests only — it is not this EC2 setup.

---

## 1. EC2 instance creation

1. AWS Console → **EC2** → **Launch instance**.
2. Name: `swust-api`.
3. AMI: **Ubuntu Server 24.04 LTS** (x86_64).
4. Instance type: start with **t3.small** (or `t3.micro` for learning).
5. Key pair: create/download a `.pem` key (store it privately; never commit it).
6. Network:
   - VPC: default is fine for a first deploy.
   - Auto-assign public IP: enable (or put the instance behind an Application Load Balancer later).
7. Storage: **20–30 GiB gp3**.
8. Advanced → IAM instance profile (optional but good): attach a role with least-privilege S3 access so you can avoid long-lived access keys on disk.

Do **not** open the world to SSH with a password. Use the key pair only.

---

## 2. SSH configuration

On your laptop (PowerShell / macOS / Linux):

```bash
chmod 400 /path/to/your-key.pem
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

Optional `~/.ssh/config` entry:

```
Host swust-api
  HostName YOUR_EC2_PUBLIC_IP
  User ubuntu
  IdentityFile ~/.ssh/your-key.pem
  IdentitiesOnly yes
```

Then: `ssh swust-api`

**Hardening tip:** after first login, restrict the AWS security group SSH rule to **your IP only** (see §13).

Create a non-root deploy user:

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG sudo deploy
sudo mkdir -p /home/deploy/.ssh
sudo cp /home/ubuntu/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

Later commands assume you can `sudo` as `deploy`.

---

## 3. Linux package installation

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y \
  python3 python3-venv python3-pip python3-dev \
  build-essential libpq-dev \
  nginx git curl ufw \
  certbot python3-certbot-nginx \
  fail2ban
```

PostgreSQL client tools (even if the DB is on RDS):

```bash
sudo apt install -y postgresql-client
```

If you run PostgreSQL **on the same EC2** (simpler for learning, weaker for production):

```bash
sudo apt install -y postgresql postgresql-contrib
```

Prefer **Amazon RDS** for anything beyond a classroom demo.

---

## 4. Python virtual environment

App layout on the server:

```text
/var/www/swust-api/
  repo/                 # git working copy
  releases/             # timestamped releases
  current -> releases/… # active symlink
/etc/swust-api/env      # secrets (mode 600)
/var/log/swust-api/     # optional app logs
```

```bash
sudo mkdir -p /var/www/swust-api/{repo,releases} /etc/swust-api /var/log/swust-api /var/www/certbot
sudo chown -R deploy:deploy /var/www/swust-api /var/log/swust-api
sudo chown root:deploy /etc/swust-api
sudo chmod 750 /etc/swust-api
```

Clone (as `deploy`):

```bash
sudo -u deploy -H bash -lc '
  git clone https://github.com/YOUR_ORG/YOUR_REPO.git /var/www/swust-api/repo
'
```

Use a deploy key or HTTPS credential helper; **do not** embed PATs in the remote URL in scripts you commit.

Create the first release manually (or use `deploy/scripts/release.sh` after the first symlink exists).

This GitHub repo nests the app under `swust-campus-marketplace/`. Releases only sync that folder so paths stay `current/backend`, `current/deploy`, etc.

```bash
sudo -u deploy -H bash -lc '
  cd /var/www/swust-api
  TS=$(date +%Y%m%d%H%M%S)
  rsync -a --exclude .git repo/swust-campus-marketplace/ "releases/$TS/"
  ln -sfn "releases/$TS" current
  cd current/backend
  python3 -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
'
```

For a shorter free-tier path (Vercel + EC2 + Supabase), see [`QUICKSTART_DEPLOY.md`](QUICKSTART_DEPLOY.md).

---

## 5. PostgreSQL configuration

### Recommended free path: Supabase

1. Create a Supabase project.
2. **Settings → Database** → copy the URI connection string.
3. Set on EC2:

```bash
DATABASE_URL=postgres://postgres.YOUR_REF:PASSWORD@HOST:5432/postgres
DATABASE_SSLMODE=require
```

Use a direct/session connection for migrations if the transaction pooler errors.

### Alternative: Amazon RDS

1. Create an RDS PostgreSQL 16 instance in a **private subnet** if possible.
2. Security group: allow inbound **5432** only from the EC2 security group (not `0.0.0.0/0`).
3. Enable encryption at rest; force SSL.
4. Create DB/user (from a bastion or the EC2 box):

```bash
psql "host=YOUR_RDS_ENDPOINT dbname=postgres user=postgres sslmode=require"
```

```sql
CREATE DATABASE swust_marketplace;
CREATE USER api_user WITH PASSWORD 'use-a-long-random-password';
GRANT ALL PRIVILEGES ON DATABASE swust_marketplace TO api_user;
\c swust_marketplace
GRANT ALL ON SCHEMA public TO api_user;
```

Put the connection string in `/etc/swust-api/env` as `DATABASE_URL` (never in git).

### Learning-only: PostgreSQL on the same EC2

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE swust_marketplace;
CREATE USER api_user WITH PASSWORD 'use-a-long-random-password';
GRANT ALL PRIVILEGES ON DATABASE swust_marketplace TO api_user;
```

Edit `pg_hba.conf` so the app user can connect via local socket/password; do not expose 5432 on the public security group.

---

## 6. Environment variables

```bash
sudo cp /var/www/swust-api/current/deploy/env/production.env.example /etc/swust-api/env
sudo chown root:deploy /etc/swust-api/env
sudo chmod 640 /etc/swust-api/env
sudo nano /etc/swust-api/env
```

Fill placeholders. Minimum secure set:

| Variable | Example shape (not real values) |
| --- | --- |
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` |
| `DEBUG` | `false` |
| `SECRET_KEY` | ≥50 random characters |
| `ALLOWED_HOSTS` | `api.example.com` |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://your-app.vercel.app` |
| `DATABASE_URL` | `postgres://USER:PASSWORD@HOST:5432/swust_marketplace` |
| `DATABASE_SSLMODE` | `require` (RDS) |
| `SECURE_SSL_REDIRECT` | `true` |
| `USE_X_FORWARDED_HOST` | `true` |
| `USE_S3_MEDIA` | `true` |
| `AWS_STORAGE_BUCKET_NAME` | your bucket name |
| `GUNICORN_BIND` | `127.0.0.1:8000` |

**Static files:** WhiteNoise + `collectstatic` on the EC2 disk (served by Nginx `/static/`).

**Media files:** S3 (or S3-compatible). Do not rely on EC2 local disk for uploads in production.

Generate a secret without printing it to shell history tools you share:

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
```

Paste into `/etc/swust-api/env` only; do not commit it.

Verify Django can load settings (no secrets printed):

```bash
sudo -u deploy -H bash -lc '
  set -a; source /etc/swust-api/env; set +a
  cd /var/www/swust-api/current/backend
  source .venv/bin/activate
  python manage.py check --deploy
'
```

---

## 7. Git deployment

Day-to-day flow:

1. Merge to `main` (or tag a release) on your Git host.
2. On EC2, as `deploy`:

```bash
cd /var/www/swust-api/repo
chmod +x deploy/scripts/release.sh deploy/scripts/rollback.sh
./deploy/scripts/release.sh main
```

The release script:

- fetches the ref
- creates `/var/www/swust-api/releases/<timestamp>`
- installs requirements into that release’s `.venv`
- runs migrations + `collectstatic` + `check --deploy`
- flips `current` symlink
- restarts Gunicorn via systemd
- keeps the last few releases for rollback

If you prefer a fully manual deploy once:

```bash
cd /var/www/swust-api/repo
git pull
# then recreate a release as in §4, migrate, collectstatic, restart gunicorn
```

---

## 8. Django migrations

```bash
sudo -u deploy -H bash -lc '
  set -a; source /etc/swust-api/env; set +a
  cd /var/www/swust-api/current/backend
  source .venv/bin/activate
  python manage.py migrate --noinput
'
```

Create an admin user once (interactive; password not stored in files):

```bash
python manage.py createsuperuser
```

---

## 9. collectstatic

```bash
sudo -u deploy -H bash -lc '
  set -a; source /etc/swust-api/env; set +a
  cd /var/www/swust-api/current/backend
  source .venv/bin/activate
  python manage.py collectstatic --noinput
'
```

Nginx serves `/static/` from `.../current/backend/staticfiles/`.

---

## 10. Gunicorn

Gunicorn config: `backend/gunicorn.conf.py` (default bind `127.0.0.1:8000`).

Install the systemd unit:

```bash
sudo cp /var/www/swust-api/current/deploy/systemd/gunicorn.service /etc/systemd/system/gunicorn.service
sudo systemctl daemon-reload
sudo systemctl enable --now gunicorn
sudo systemctl status gunicorn --no-pager
```

Smoke test on the server (HTTP to loopback, not public):

```bash
curl -sS http://127.0.0.1:8000/api/v1/health/
```

You should see JSON like `{"status":"ok","api":"v1"}`.

---

## 11. Nginx reverse proxy

```bash
sudo cp /var/www/swust-api/current/deploy/nginx/api.example.com.conf \
  /etc/nginx/sites-available/api.example.com
# Edit server_name / certificate paths if needed
sudo nano /etc/nginx/sites-available/api.example.com
sudo ln -sf /etc/nginx/sites-available/api.example.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

Nginx:

- Listens on 80/443
- Proxies to Gunicorn on `127.0.0.1:8000`
- Sets `X-Forwarded-Proto` so Django HTTPS settings work
- Serves WhiteNoise-collected static files under `/static/`

DNS: create an **A record** `api.example.com` → EC2 Elastic IP (prefer Elastic IP so the address does not change).

---

## 12. HTTPS

With DNS pointing at the instance and port 80 open:

```bash
sudo mkdir -p /var/www/certbot
sudo certbot --nginx -d api.example.com
```

Certbot installs certificates and can enable auto-renewal.

Check renewal:

```bash
sudo systemctl status certbot.timer --no-pager
sudo certbot renew --dry-run
```

After TLS works:

```bash
curl -fsS https://api.example.com/api/v1/health/
```

Confirm Django redirects HTTP→HTTPS and HSTS is on (`SECURE_SSL_REDIRECT=true`, `SECURE_HSTS_SECONDS=31536000`).

---

## 13. Security groups

EC2 security group (public API instance):

| Type | Port | Source | Why |
| --- | --- | --- | --- |
| SSH | 22 | **Your IP /32 only** | Admin access |
| HTTP | 80 | `0.0.0.0/0`, `::/0` | ACME + redirect |
| HTTPS | 443 | `0.0.0.0/0`, `::/0` | Public API |

**Do not** open:

- `8000` (Gunicorn stays on localhost)
- `5432` to the internet

RDS security group: allow `5432` **only** from the EC2 app security group.

---

## 14. Firewall (UFW on the instance)

Defense in depth on top of security groups:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

If you lock yourself out of SSH, use AWS **EC2 Instance Connect** / Session Manager (if configured) or temporarily open the console security group from a known IP.

---

## 15. Process management

| Process | Manager |
| --- | --- |
| Gunicorn | **systemd** (`gunicorn.service`) |
| Nginx | systemd (`nginx.service`) |
| PostgreSQL | RDS (managed) or systemd (`postgresql`) |
| Certbot renew | `certbot.timer` |

Useful commands:

```bash
sudo systemctl status gunicorn nginx
sudo journalctl -u gunicorn -n 100 --no-pager
sudo journalctl -u nginx -n 50 --no-pager
```

---

## 16. Automatic restart

The unit file sets:

```ini
Restart=always
RestartSec=5
```

Enable on boot:

```bash
sudo systemctl enable gunicorn nginx
```

After a reboot, Gunicorn and Nginx should come back without manual steps. Confirm:

```bash
sudo reboot
# wait, then:
curl -fsS https://api.example.com/api/v1/health/
```

---

## 17. Logging

| Source | Where |
| --- | --- |
| Gunicorn / Django | `journalctl -u gunicorn` (stdout/stderr) |
| Nginx access/error | `/var/log/nginx/api.example.com.*.log` |
| UFW | `/var/log/ufw.log` |

Django production settings already log to console (`LOG_LEVEL=INFO` / `ERROR` for `django.request`).

Optional logrotate for Nginx is installed by the `nginx` package by default.

Do not log `Authorization` headers, cookies, or env files.

---

## 18. Backup considerations

**Database**

- Prefer RDS automated backups + point-in-time recovery.
- Extra logical dump (cron as `deploy`, store off-box):

```bash
# Example shape only — store dumps in S3, not on the same disk forever
pg_dump "$DATABASE_URL" --no-owner --format=custom -f "/tmp/swust-$(date +%F).dump"
```

**Media**

- S3 versioning + lifecycle rules.
- Cross-region replication if the data matters.

**Code / releases**

- Git is the source of truth.
- Keep several directories under `/var/www/swust-api/releases/` (release script prunes old ones).

**Secrets**

- Back up `/etc/swust-api/env` only via a secrets manager or encrypted offline store — never email it.

**Recovery test**

- Periodically restore a dump into a staging database and run `migrate` + health checks.

---

## Vercel frontend (not deployed on EC2)

On Vercel, set:

```text
VITE_API_BASE_URL=https://api.example.com/api/v1
```

Rebuild/redeploy the frontend after the API hostname is live.

On the API, ensure CORS/CSRF allow your Vercel origin(s).

---

## Smoke-test checklist

1. `curl -fsS https://api.example.com/api/v1/health/` → `status: ok`
2. `curl -I https://api.example.com/api/docs/` → requires admin auth in production
3. Register/login from the Vercel app against the API
4. Upload a listing image → object appears in S3
5. `sudo systemctl is-active gunicorn nginx`
6. `python manage.py check --deploy` exits clean

---

## Rollback procedure

Releases are directories under `/var/www/swust-api/releases/`. `current` is a symlink.

### A. Quick rollback (preferred)

```bash
ls -1 /var/www/swust-api/releases
/var/www/swust-api/current/deploy/scripts/rollback.sh 20260926120000
```

This:

1. Points `current` at the chosen release
2. Restarts Gunicorn
3. Hits the health endpoint

### B. Manual rollback

```bash
ln -sfn /var/www/swust-api/releases/PREVIOUS_TS /var/www/swust-api/current
sudo systemctl restart gunicorn
curl -fsS https://api.example.com/api/v1/health/
```

### C. Database rollback (careful)

Code rollback does **not** undo migrations.

- Prefer forward fixes (`migrate` to a new migration).
- If you must reverse: restore an RDS snapshot / `pg_restore` taken **before** the bad migration, then point `current` at a matching code release.
- Never run destructive SQL on production without a verified backup.

### D. Config rollback

If a bad `/etc/swust-api/env` change broke the service, restore the previous env from your secrets backup, then:

```bash
sudo systemctl restart gunicorn
```

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| 502 Bad Gateway | `systemctl status gunicorn`; `curl 127.0.0.1:8000/api/v1/health/` |
| 400 DisallowedHost | `ALLOWED_HOSTS` includes `api.example.com` |
| CORS errors from Vercel | `CORS_ALLOWED_ORIGINS` / regex; HTTPS origins only |
| Static 404 | rerun `collectstatic`; Nginx `alias` path |
| SSL errors | DNS A record; `certbot certificates`; security group 80/443 |
| DB connection errors | RDS SG, `DATABASE_URL`, `DATABASE_SSLMODE=require` |

---

## Security defaults reminder

- `DEBUG=false`
- Gunicorn on **127.0.0.1** only
- SSH and DB ports restricted
- Secrets only in `/etc/swust-api/env` (mode `640`/`600`)
- HTTPS + HSTS
- Media on S3, not world-writable EC2 disk
- Production OpenAPI docs require admin

You are not done deploying until health checks pass over **HTTPS** and the Vercel app can call the API successfully.
