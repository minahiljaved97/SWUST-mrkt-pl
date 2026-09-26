# Security audit — SWUST Campus Marketplace

Date: 2026-09-26  
Scope: Backend (Django/DRF) + Frontend (React/Vite)  
Command: `python manage.py check --deploy` (production settings)

## Summary

Overall posture is solid for a JWT SPA campus marketplace: authenticated-by-default API, role permissions, object-level checks for listings/messaging/favorites/reports, JWT rotation + blacklist, auth throttling, and pagination caps.

This audit pass hardened uploads, global API throttling, production cookie/HSTS/referrer settings, admin user serialization (no phone), and OpenAPI access in production. Expanded automated tests across auth, listings, categories, favorites, messaging, reports, and admin dashboard.

## Findings fixed in this pass

| Area | Issue | Fix |
| --- | --- | --- |
| Uploads | Weak size/MIME checks | `validate_image_upload` + 5 MiB limit; Django upload memory caps |
| Throttling | Rates defined but not applied globally | `DEFAULT_THROTTLE_CLASSES` for anon/user |
| Sensitive data | Admin `/auth/users/` exposed profile phone | `AdminManagedUserSerializer` without phone/image |
| Production hardening | Missing referrer/cookie flags | HttpOnly/SameSite cookies, `SECURE_REFERRER_POLICY` |
| OpenAPI | Schema/docs AllowAny in all envs | Production serves Spectacular with `IsAdmin` |
| Schema generation | AnonymousUser queryset crashes | `swagger_fake_view` guards in favorites/messaging |
| Frontend uploads | Client allowed oversized files | 5 MiB + MIME filter in `ListingForm` |

## `check --deploy` notes

With a short temporary `SECRET_KEY`, Django emits `security.W009` (key length). Production must use a long random `SECRET_KEY` (≥50 chars). Remaining messages are primarily `drf_spectacular` schema typing warnings, not runtime security defects.

## Remaining known limitations

1. JWT access/refresh tokens live in `sessionStorage` (XSS-resistant vs `localStorage` cookies tradeoffs; still vulnerable if XSS is introduced). Prefer HttpOnly cookies + CSRF for a future hardening phase.
2. Media files are served by Django in `DEBUG` only; production needs object storage / CDN with authenticated or signed URLs if listings should not be world-readable by direct path guessing.
3. Admin can still change user roles via legacy `/auth/users/` PATCH — intentional, but should be audited operationally.
4. Rate limits are in-memory (default DRF cache); multi-worker production should use a shared cache backend.
5. No WebSocket channel security yet (messaging is REST + polling only).
6. Frontend automated tests cover helpers/guards, not full browser E2E.

## Test inventory

Backend (`manage.py test` — 45 tests OK):

- `accounts` — register/login/me/logout, email domain, admin user list privacy, authz
- `categories` — active-only student list, admin CRUD authz
- `listings` — ownership, image upload authz, upload validators, pagination cap
- `favorites` — student-only favorite flows + duplicates (existing)
- `messaging` — participant isolation (existing)
- `reports` — student create + admin moderation authz (existing)
- `dashboard` — admin summary/stats/users/listings/categories authz (existing)

Frontend (`npm test`):

- favorites helpers
- token storage contract, admin route guard, API base URL safety
