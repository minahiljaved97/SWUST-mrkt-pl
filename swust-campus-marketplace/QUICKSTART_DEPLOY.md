# Free-tier deploy: Vercel + AWS EC2 + Supabase

Target layout:

```text
Browser → Vercel (React)  --HTTPS-->  EC2 Nginx → Gunicorn → Django
                                              │
                                              ├→ Supabase PostgreSQL (DB)
                                              └→ media: Supabase Storage / S3 / EC2 disk
```

| Piece | Where | Free option |
| --- | --- | --- |
| Frontend | Vercel | Hobby plan |
| Backend API | AWS EC2 | Free tier `t2.micro` / `t3.micro` (12 months typically) |
| Database | **Supabase** | Free PostgreSQL (recommended — do not use SQLite in prod) |
| Media | Supabase Storage or EC2 disk | Free for light demos |

SQLite is local-dev only. Production settings reject non-Postgres `DATABASE_URL`.

Repo paths this guide assumes:

- GitHub repo: `minahiljaved97/SWUST-mrkt-pl`
- App lives in `swust-campus-marketplace/`
- Default branch: `master`
- Release script syncs only that folder into `/var/www/swust-api/current/{backend,frontend,deploy}`

---

## 1. Database on Supabase (do this first)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database**.
3. Copy the **URI** connection string (use the **direct** / session host for Django, not transaction pooler if migrations fail).
4. Reset/set the DB password and keep it private.
5. You will put this into EC2 `/etc/swust-api/env` as:

```bash
DATABASE_URL=postgres://postgres.XXXX:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
DATABASE_SSLMODE=require
```

If Supabase shows `postgresql://…`, change the scheme to `postgres://` (Django/psycopg accepts both; this project’s examples use `postgres://`).

No need for Amazon RDS on the free plan.

---

## 2. Backend on AWS EC2

Follow the detailed steps in [`DEPLOYMENT.md`](DEPLOYMENT.md). Short version:

### 2.1 Launch

- AMI: Ubuntu 24.04 LTS
- Type: `t2.micro` or `t3.micro`
- Security group inbound: **22** (your IP), **80**, **443**
- Do **not** open 8000 or 5432 to the world

### 2.2 Server packages + layout

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip python3-dev \
  build-essential libpq-dev nginx git curl ufw certbot python3-certbot-nginx
```

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG sudo deploy
# copy your SSH authorized_keys to deploy as in DEPLOYMENT.md

sudo mkdir -p /var/www/swust-api/{repo,releases} /etc/swust-api /var/log/swust-api
sudo chown -R deploy:deploy /var/www/swust-api /var/log/swust-api
sudo chown root:deploy /etc/swust-api
sudo chmod 750 /etc/swust-api
```

### 2.3 Clone and first release

```bash
sudo -u deploy -H bash -lc '
  git clone https://github.com/minahiljaved97/SWUST-mrkt-pl.git /var/www/swust-api/repo
  cd /var/www/swust-api
  TS=$(date +%Y%m%d%H%M%S)
  rsync -a --exclude .git \
    repo/swust-campus-marketplace/ "releases/$TS/"
  ln -sfn "releases/$TS" current
  cd current/backend
  python3 -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
'
```

### 2.4 Env file

```bash
sudo cp /var/www/swust-api/current/deploy/env/production.env.example /etc/swust-api/env
sudo chown root:deploy /etc/swust-api/env
sudo chmod 640 /etc/swust-api/env
sudo nano /etc/swust-api/env
```

Fill at minimum:

- `SECRET_KEY` (≥50 random chars)
- `ALLOWED_HOSTS=api.yourdomain.com`
- `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` = your Vercel URL(s)
- `DATABASE_URL` + `DATABASE_SSLMODE=require` (Supabase)
- `JWT_SIGNING_KEY` (long random string)

For a classroom demo without S3 yet:

```bash
USE_S3_MEDIA=false
SERVE_MEDIA=true
```

(Later move media to Supabase Storage or S3.)

### 2.5 Migrate + Gunicorn + Nginx + HTTPS

```bash
sudo -u deploy -H bash -lc '
  set -a; source /etc/swust-api/env; set +a
  cd /var/www/swust-api/current/backend
  source .venv/bin/activate
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput
  python manage.py seed_categories
  python manage.py check --deploy
'
```

Install systemd/Nginx from `current/deploy/` (see `DEPLOYMENT.md` §§ Gunicorn / Nginx / Certbot).  
Point DNS `api.yourdomain.com` → EC2 public IP, then:

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Health check: `https://api.yourdomain.com/api/v1/health/`

Later deploys:

```bash
HEALTH_URL=https://api.yourdomain.com/api/v1/health/ \
  /var/www/swust-api/current/deploy/scripts/release.sh master
```

---

## 3. Frontend on Vercel

1. Import the GitHub repo in Vercel.
2. **Root Directory:** `swust-campus-marketplace/frontend`
3. Framework: Vite (auto from `vercel.json`)
4. Environment variable (Production + Preview):

| Name | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://api.yourdomain.com/api/v1` |

Never put Django secrets or `DATABASE_URL` in Vercel.

Deploy. After you get `https://something.vercel.app`, put that URL into EC2 CORS/CSRF env and restart Gunicorn:

```bash
sudo systemctl restart gunicorn
```

Optional: custom domain on Vercel, then update CORS again.

CLI alternative (from your laptop):

```bash
cd swust-campus-marketplace/frontend
npx vercel login
npx vercel link
npx vercel env add VITE_API_BASE_URL production
npx vercel --prod
```

---

## 4. Smoke checklist

- [ ] `GET https://api…/api/v1/health/` → `{"status":"ok",…}`
- [ ] Vercel app loads over HTTPS
- [ ] Login with a campus email works (seed: `./scripts/seed_demo.sh` on EC2 after migrate)
- [ ] CORS errors absent in browser Network tab
- [ ] Listing create + image upload works (if media enabled)

Demo logins (only after you run seed on the **production** DB intentionally):

| Email | Password |
| --- | --- |
| admin@swust.edu.cn | admin |
| student@swust.edu.cn | student |

Change passwords before any real users.

---

## 5. What not to do

- Do not deploy SQLite to EC2 for production
- Do not open Postgres/Supabase to `0.0.0.0/0` beyond what Supabase already manages
- Do not commit `/etc/swust-api/env` or real `.env` files
- Do not put secrets in Vercel `VITE_*` vars

Full EC2 hardening, rollback, and Nginx details: [`DEPLOYMENT.md`](DEPLOYMENT.md).  
Vercel env notes: [`frontend/VERCEL.md`](frontend/VERCEL.md).
