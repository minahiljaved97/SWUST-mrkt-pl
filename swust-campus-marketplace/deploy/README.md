# Deployment templates (EC2)

Start with [`../QUICKSTART_DEPLOY.md`](../QUICKSTART_DEPLOY.md) (Vercel + EC2 + Supabase).
Full EC2 detail: [`../DEPLOYMENT.md`](../DEPLOYMENT.md).

Templates contain **placeholders only** — no real credentials.

`release.sh` syncs `swust-campus-marketplace/` from the git clone into each release (default ref: `master`).

| Path | Install on server as |
| --- | --- |
| `systemd/gunicorn.service` | `/etc/systemd/system/gunicorn.service` |
| `nginx/api.example.com.conf` | `/etc/nginx/sites-available/api.example.com` |
| `env/production.env.example` | Copy to `/etc/swust-api/env` (mode 640), then fill secrets |
| `scripts/release.sh` | Run from the git checkout as user `deploy` |
| `scripts/rollback.sh` | Run to flip `current` to a previous release |

Replace `api.example.com` with your API hostname before enabling Nginx/Certbot.
