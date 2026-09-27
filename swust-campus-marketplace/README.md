# Prerequisites
- Python 3.12+ (3.14 is fine if Django installs)
- Node.js 20+ and npm
- PostgreSQL 16+ for production (local development defaults to SQLite)

# Installation
## Backend
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# set SECRET_KEY in .env before any non-local use

## Frontend
cd frontend
npm install
copy .env.example .env

# Environment variables
## Backend (`backend/.env`) — never commit this file
- SECRET_KEY
- DEBUG
- DJANGO_SETTINGS_MODULE (`config.settings.development` or `config.settings.production`)
- DATABASE_URL (`sqlite:///db.sqlite3` locally, `postgres://USER:PASSWORD@HOST:5432/DB` in production)
- ALLOWED_HOSTS
- CORS_ALLOWED_ORIGINS
- CSRF_TRUSTED_ORIGINS
- CORS_ALLOW_CREDENTIALS
- JWT_SIGNING_KEY (optional; falls back to SECRET_KEY)
- JWT_ACCESS_MINUTES
- JWT_REFRESH_DAYS
- ALLOWED_EMAIL_DOMAINS
- TIME_ZONE

## Frontend (`frontend/.env` / `.env.production`)
- `VITE_API_BASE_URL` — required (no hardcoded fallback). Local example: `http://127.0.0.1:8000/api/v1`. Production: absolute `https://…/api/v1` or same-origin `/api/v1`.

# Backend startup
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py runserver 8000

API: http://127.0.0.1:8000/api/v1/health/

# Frontend startup
cd frontend
npm run dev

App: http://localhost:5173/

# Production deployment (do not deploy from this checklist alone)

**Full beginner guide (EC2 + Nginx + Gunicorn + HTTPS + rollback):** see [`DEPLOYMENT.md`](DEPLOYMENT.md).

Target topology:

```
                 Internet
                    │
                    ▼
              Vercel Frontend
              React + Vite
                    │
                    │ HTTPS API
                    ▼
              Django REST API
                 AWS EC2
                    │
            ┌───────┴────────┐
            ▼                ▼
       PostgreSQL        Media Storage
       (RDS / hosted)    S3 / compatible
```

| Layer | Where | Notes |
| --- | --- | --- |
| SPA | Vercel | Set `VITE_API_BASE_URL=https://<api-host>/api/v1` in Vercel env; see `frontend/vercel.json` |
| API | AWS EC2 + Gunicorn | `config.settings.production`, TLS via ALB/nginx/Cloudflare |
| DB | PostgreSQL | Prefer RDS; `DATABASE_URL` + `DATABASE_SSLMODE=require` |
| Media | S3 / compatible | `USE_S3_MEDIA=true` + bucket credentials (not EC2 local disk) |

## Backend production settings
- Module: `config.settings.production` (`DEBUG=False`)
- Requires: long `SECRET_KEY` (≥50), `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` (include your Vercel URL), `CSRF_TRUSTED_ORIGINS`, PostgreSQL `DATABASE_URL`
- Optional: `CORS_ALLOWED_ORIGIN_REGEXES=^https://.*\.vercel\.app$` for Vercel preview deploys
- HTTPS / cookies: `SECURE_SSL_REDIRECT`, HSTS, secure HttpOnly cookies, `SECURE_PROXY_SSL_HEADER` behind a reverse proxy
- Static files: WhiteNoise + `collectstatic` on the EC2 app
- Media files: S3 via `django-storages` when `USE_S3_MEDIA=true` (recommended); `SERVE_MEDIA` only for local Docker smoke tests
- WSGI: Gunicorn (`gunicorn config.wsgi:application --config gunicorn.conf.py`)
- Logging: console verbose logs (`LOG_LEVEL`)
- OpenAPI `/api/docs/` is admin-only in production

Copy `backend/.env.example` and set production values via EC2/CI secrets — never commit real credentials.

Deploy check (local, with dummy but valid-length secrets — does not start a server):

```bash
cd backend
.\.venv\Scripts\Activate.ps1
$env:DJANGO_SETTINGS_MODULE="config.settings.production"
$env:SECRET_KEY="local-deploy-check-secret-key-at-least-fifty-characters-xx"
$env:DATABASE_URL="postgres://swust:swust@127.0.0.1:5432/swust_marketplace"
$env:ALLOWED_HOSTS="api.example.com"
$env:CORS_ALLOWED_ORIGINS="https://your-app.vercel.app"
$env:CSRF_TRUSTED_ORIGINS="https://your-app.vercel.app"
$env:SECURE_SSL_REDIRECT="true"
python manage.py check --deploy
```

## Frontend on Vercel

Full guide: [`frontend/VERCEL.md`](frontend/VERCEL.md).

Safe env only (Vercel → Project → Environment Variables, Production + Preview):

```text
VITE_API_BASE_URL=https://api.example.com/api/v1
```

Never add Django `SECRET_KEY`, `DATABASE_URL`, JWT signing keys, or AWS credentials to Vercel — only `VITE_*` values that are safe in the browser.

```bash
cd frontend
npx vercel login
npx vercel link
npx vercel env add VITE_API_BASE_URL production
npx vercel --prod
```

- Framework / SPA: `frontend/vercel.json` (rewrites to `index.html`)
- Build: `npm run build` → `dist/`
- HTTPS: automatic on `*.vercel.app`
- Production error UI: `ErrorBoundary` + route `errorElement`

## Docker (local production-like smoke test only)

```bash
cd swust-campus-marketplace
copy .env.docker.example .env.docker
# edit placeholders in .env.docker
docker compose --env-file .env.docker up --build
```

- `db` — PostgreSQL 16
- `api` — Django + Gunicorn (migrate + collectstatic on start)
- `web` — Nginx SPA + reverse proxy to API (`http://localhost:8080` by default)

Local Docker does not replace Vercel + EC2; it is for consistency testing only.

# Notes
Do not commit `.env`, `.env.docker`, or `.env.production`. Production must use PostgreSQL and `config.settings.production`.

# API documentation
Interactive OpenAPI docs are generated with **drf-spectacular** (Swagger UI + ReDoc).

| Resource | URL |
| --- | --- |
| OpenAPI schema (JSON) | http://127.0.0.1:8000/api/schema/ |
| Swagger UI | http://127.0.0.1:8000/api/docs/ |
| ReDoc | http://127.0.0.1:8000/api/redoc/ |

Regenerate / validate the schema locally:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py spectacular --file schema.yaml --validate
```

## Auth model
- Most endpoints require `Authorization: Bearer <access_token>`.
- Obtain tokens via `POST /api/v1/auth/login/`; refresh via `POST /api/v1/auth/token/refresh/`.
- `POST /api/v1/auth/logout/` blacklists the refresh token.
- Public (no JWT): register, login, token refresh, health.
- Development serves schema/docs publicly; production restricts schema serving to admins.

## Documented tags
Each operation documents HTTP method, URL, authentication requirement, request parameters, request body, responses, possible errors, and permissions.

| Tag | Scope |
| --- | --- |
| Health | `GET /api/v1/health/` |
| Authentication | register, login, refresh, logout |
| Users & Profiles | `GET\|PATCH /api/v1/auth/me/`, admin `/api/v1/auth/users/` |
| Categories | active catalog (`/api/v1/categories/`) |
| Listings | CRUD, `mine`, filters/search |
| Listing Images | upload / delete / set primary under `/listings/{id}/images/` |
| Favorites | `/listings/{id}/favorite/` and `/favorites/` (students) |
| Conversations | inbox, start/reopen thread |
| Messages | send message, mark read |
| Reports | student `POST /api/v1/reports/` |
| Admin Reports | `/api/v1/admin/reports/` |
| Admin Dashboard | summary, statistics, admin users/listings/categories |

## Common conventions
- Base path: `/api/v1/`
- Pagination: `page`, `page_size` (max 50) on list endpoints
- Errors: `{ "detail": "...", "errors": { "field": ["..."] } }` with `400` / `401` / `403` / `404` / `429`
- Students: favorites, messaging, report creation
- Admins: user management, report moderation, dashboard APIs
- Listing delete is a soft remove (`REMOVED`); image uploads are multipart (max 6 images, 5 MiB, JPEG/PNG/WebP/GIF)

Do not put secrets, signing keys, or production credentials in the schema or README examples.

# Marketplace (Phase 5–6)
Signed-in routes:
- `/` home with search, categories, recent listings
- `/marketplace` browse/filter/paginate
- `/marketplace/:id` listing detail (favorite, report, contact seller)
- `/listings/new` create listing with images
- `/listings/:id/edit` edit own listing (ownership enforced)
- `/listings/mine` manage own listings / status / delete

# Favorites (Phase 7)
Students-only favorites (see Swagger tag **Favorites**).

UI:
- Heart on listing cards and detail pages (optimistic cache update with rollback)
- `/favorites` — saved listings, empty/loading/error states, removed overlay

Tests:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py test favorites

cd ../frontend
npm test
```

# Messaging (Phase 8)
REST only (no WebSockets). Students only; participants-only access (see Swagger tags **Conversations** / **Messages**).

UI:
- `/messages` conversation list + empty state
- `/messages/:conversationId` message panel + input (TanStack Query polling)
- Listing detail **Contact seller** opens/creates the conversation

Tests:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py test messaging
```

# Reporting & moderation (Phase 9)
Students create reports; admin notes/status are never returned to students (see **Reports** / **Admin Reports** in Swagger).

UI:
- Report modal on listing detail (report listing or seller) with neutral confirmation
- `/admin/reports` moderation queue

Tests:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py test reports
```

# Admin dashboard (Phase 10)
Admin-only UI at `/admin` with overview cards and sections for users, listings, categories, reports, and statistics (see Swagger tag **Admin Dashboard**).

Admin user payloads omit phone numbers.

Tests:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py test dashboard reports
```

# Demo seed

From anywhere (script resolves the project path):

```bash
./scripts/seed_demo.sh
```

Or from `backend/`:

```bash
python manage.py seed_demo
```

| Email | Password | Role |
| --- | --- | --- |
| admin@swust.edu.cn | admin | ADMIN |
| student@swust.edu.cn | student | STUDENT |
| buyer@swust.edu.cn | buyer | STUDENT |

# Notes
Do not commit `.env`, `.env.docker`, or `.env.production`. Production must use PostgreSQL and `config.settings.production`.

# Database / admin
Categories seed on migrate. Re-run with `python manage.py seed_categories`.
Django admin: http://127.0.0.1:8000/admin/
