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

## Frontend (`frontend/.env`)
- VITE_API_BASE_URL (example: `http://127.0.0.1:8000/api/v1`)

# Backend startup
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py runserver 8000

API: http://127.0.0.1:8000/api/v1/health/
OpenAPI schema: http://127.0.0.1:8000/api/schema/
Swagger UI: http://127.0.0.1:8000/api/docs/

# Frontend startup
cd frontend
npm run dev

App: http://localhost:5173/

# Notes
Do not commit `.env`. Production must use PostgreSQL and `config.settings.production`.
Business features (listings, messaging, reports) are not implemented in Phase 1.
