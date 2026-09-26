# SWUST Campus Marketplace & Exchange System

Architecture and design document. **Do not treat this as an implementation plan to execute in this file; implementation comes later.**

This document describes a production-style campus peer-to-peer marketplace for students of Southwest University of Science and Technology (SWUST). There are **no online payments**. Contact and coordination happen in-app. The system is sized for a master’s university project: complete, secure enough to defend, and not over-engineered.

---

## 1. Recommended system architecture

The product is a **decoupled SPA + REST API**.

```
[React + TypeScript (Vite)]
        HTTPS / JSON
[Django + Django REST Framework]
        │
        ├── PostgreSQL  (system of record)
        └── Local media files  (listing images; storage backend swappable later)
```

### Runtime layout

| Layer | Responsibility |
| --- | --- |
| Frontend | UI, client routing, form validation, auth token handling, TanStack Query cache |
| API | Authentication, authorization, validation, search/filter/pagination, file upload rules |
| Database | Normalized relational data, constraints, uniqueness |
| Media | Listing and avatar images; not stored in PostgreSQL |

### Repository layout (monorepo)

A single git repository with two applications is enough for this project. Docker is **not** required.

```
myproject1/
  frontend/          # Vite + React + TypeScript
  backend/           # Django project
  docs/              # this document lives at repo root or here
  .env.example files in each app (never commit real secrets)
```

Local development: Node for the SPA, Python virtualenv for Django, PostgreSQL installed natively (or a hosted Postgres). Production uses PostgreSQL only. SQLite is acceptable **only** as an optional local fallback, never as the production database.

### Backend Django apps

| App | Owns |
| --- | --- |
| `config` | Settings, URLs, WSGI/ASGI, env loading |
| `accounts` | User model, registration/login/JWT, profile, admin user management |
| `catalog` | Categories, listings, images, favorites, listing search |
| `messaging` | Conversations and messages (REST only) |
| `moderation` | Reports, admin review actions |

Cross-cutting helpers (pagination class, exception handlers, permission mixins) live in a small `core` package inside the Django project, not as extra product features.

### Frontend architecture

Feature-based folders (listings, auth, messages, admin) plus shared UI and API client. The SPA talks **only** to the REST API. It never connects to PostgreSQL.

### Explicit non-goals (v1)

- Payments, wallets, escrow
- WebSockets / live chat
- Ratings, reviews, recommendation engines
- Official SWUST SSO (not available for this project)
- Multi-university tenancy
- GIS maps
- Native mobile apps

---

## 2. Database entity list

Public-facing IDs are **UUIDs**. Integer surrogate keys are not exposed in URLs.

Every business table has `created_at`. Mutable tables also have `updated_at`.

Marketplace records that matter for audit (listings, users, reports, messages) are **not hard-deleted** in normal flows. Listings change `status`. Users are deactivated (`is_active = false`). Reports keep history.

### 2.1 User (`accounts.User`)

Custom user model (email as login identifier).

| Field | Notes |
| --- | --- |
| `id` | UUID PK |
| `email` | Unique; must match configured SWUST domains |
| `password` | Django hashed password |
| `student_id` | Unique campus student number |
| `display_name` | Public name on listings and chat |
| `phone` | Optional; **private**; never returned on other users’ public profiles |
| `avatar` | Optional image |
| `campus_area` | Optional SWUST area/campus code |
| `bio` | Optional short text |
| `role` | `STUDENT` \| `ADMIN` |
| `is_active` | Soft disable / ban |
| `created_at`, `updated_at` | |

Django `is_staff` / `is_superuser` may back the Django admin site; product authorization uses `role`.

### 2.2 Category (`catalog.Category`)

Admin-managed. Seeded with the five required categories.

| Field | Notes |
| --- | --- |
| `id` | UUID PK |
| `name` | Display name |
| `slug` | Unique, used in filters |
| `is_active` | Hide without deleting |
| `sort_order` | Admin ordering |
| `created_at`, `updated_at` | |

Seed slugs: `textbooks`, `bicycles`, `electronics`, `furniture`, `other`.

### 2.3 Listing (`catalog.Listing`)

| Field | Notes |
| --- | --- |
| `id` | UUID PK |
| `seller` | FK → User |
| `title` | |
| `description` | |
| `category` | FK → Category |
| `price` | `Decimal`; required for `SELL`; optional for `BORROW` (deposit/value) and `EXCHANGE` (estimated value) |
| `condition` | `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`, `POOR` |
| `transaction_type` | `SELL`, `BORROW`, `EXCHANGE` |
| `status` | See status machine below |
| `campus_area` | Campus/location code |
| `location_detail` | Optional coarse location (building/area). No room numbers required |
| `exchange_preference` | Optional; used when type is `EXCHANGE` |
| `borrow_notes` | Optional duration/terms text when type is `BORROW` |
| `removed_reason` | Optional; set when admin removes |
| `created_at`, `updated_at` | |

**Listing statuses:** `ACTIVE`, `RESERVED`, `SOLD`, `BORROWED`, `EXCHANGED`, `CLOSED`, `REMOVED`.

Seller-driven: `ACTIVE` → `RESERVED` → `SOLD` / `BORROWED` / `EXCHANGED` / `CLOSED`.  
Admin-driven: any non-terminal → `REMOVED`.  
`CLOSED` is seller withdrawal. `REMOVED` is moderation.

### 2.4 ListingImage (`catalog.ListingImage`)

| Field | Notes |
| --- | --- |
| `id` | UUID PK |
| `listing` | FK → Listing |
| `image` | File (Pillow-validated) |
| `sort_order` | Display order |
| `created_at` | |

Limits (enforced in API, not only UI): max 6 images per listing, JPEG/PNG/WebP, max 5 MB each.

### 2.5 Favorite (`catalog.Favorite`)

Separate relation. Not a boolean on Listing.

| Field | Notes |
| --- | --- |
| `id` | UUID PK |
| `user` | FK → User |
| `listing` | FK → Listing |
| `created_at` | |
| Unique `(user, listing)` | |

### 2.6 Conversation (`messaging.Conversation`)

REST messaging, not WebSockets.

| Field | Notes |
| --- | --- |
| `id` | UUID PK |
| `listing` | Optional FK → Listing (context for “contact seller”) |
| `created_at`, `updated_at` | `updated_at` bumped on new message |

### 2.7 ConversationParticipant (`messaging.ConversationParticipant`)

| Field | Notes |
| --- | --- |
| `id` | UUID PK |
| `conversation` | FK → Conversation |
| `user` | FK → User |
| Unique `(conversation, user)` | |

v1 assumes **exactly two** participants (buyer/borrower/exchanger and seller).

### 2.8 Message (`messaging.Message`)

| Field | Notes |
| --- | --- |
| `id` | UUID PK |
| `conversation` | FK → Conversation |
| `sender` | FK → User |
| `body` | Text; validated length |
| `is_read` | Read by the *other* participant |
| `created_at` | |

Messages are append-only for v1 (no edit/delete).

### 2.9 Report (`moderation.Report`)

Students report listings or users.

| Field | Notes |
| --- | --- |
| `id` | UUID PK |
| `reporter` | FK → User |
| `target_type` | `LISTING` \| `USER` |
| `listing` | FK, required if listing report |
| `reported_user` | FK, required if user report |
| `reason` | `SPAM`, `FRAUD`, `INAPPROPRIATE`, `PROHIBITED`, `OTHER` |
| `details` | Optional text |
| `status` | `OPEN`, `REVIEWING`, `RESOLVED`, `DISMISSED` |
| `admin_notes` | Admin only |
| `reviewed_by` | FK → User, nullable |
| `reviewed_at` | Nullable |
| `created_at`, `updated_at` | |

---

## 3. Entity relationships

```
User 1 ──< Listing
User 1 ──< ListingImage (via Listing)
User 1 ──< Favorite >── 1 Listing          (M:N via Favorite)
User 1 ──< ConversationParticipant >── 1 Conversation
Conversation 0..1 ──< Listing               (optional context)
Conversation 1 ──< Message
User 1 ──< Message (as sender)
User 1 ──< Report (as reporter)
Listing 0..1 ──< Report
User 0..1 ──< Report (as reported_user)
Category 1 ──< Listing
```

Cardinality summary:

- One user sells many listings.
- One listing belongs to one category and one seller.
- One listing has many images.
- A user may favorite many listings; a listing may be favorited by many users.
- A conversation has two participants and many messages.
- A report points at either one listing or one user.

Integrity rules:

- `Favorite` unique together prevents duplicate stars.
- Listing updates/deletes (status changes) allowed only for seller or admin.
- Conversation access only for participants.
- Report `admin_notes` / reviewer fields never exposed to students.

---

## 4. API module structure

Base path: `/api/v1/`. JSON only. DRF **ViewSets + routers** for resources; a few explicit actions for auth and stats.

### Auth (`/api/v1/auth/`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register/` | Public | Create student account (SWUST email + student_id) |
| POST | `/auth/login/` | Public | Issue JWT |
| POST | `/auth/refresh/` | Refresh token | New access token |
| POST | `/auth/logout/` | Authenticated | Blacklist/rotate refresh if enabled |
| GET | `/auth/me/` | Authenticated | Current user |
| PATCH | `/auth/me/` | Authenticated | Update own profile |

Use `djangorestframework-simplejwt`.

### Catalog

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/categories/` | Authenticated | Active categories |
| GET | `/listings/` | Authenticated | Search, filter, paginate |
| POST | `/listings/` | Authenticated student | Create listing |
| GET | `/listings/{uuid}/` | Authenticated | Detail |
| PATCH | `/listings/{uuid}/` | Owner or admin | Update fields / status |
| POST | `/listings/{uuid}/images/` | Owner | Upload image |
| DELETE | `/listings/{uuid}/images/{uuid}/` | Owner | Remove image |
| GET | `/listings/mine/` | Authenticated | Current user’s listings |
| POST | `/favorites/` | Authenticated | Favorite a listing |
| DELETE | `/favorites/{uuid}/` | Owner of favorite | Unfavorite |
| GET | `/favorites/` | Authenticated | My favorites |

Listing list query params (backend-enforced via `django-filter` + search):

- `search` — title/description
- `category` — slug or UUID
- `transaction_type`
- `condition`
- `status` (default `ACTIVE` for the public marketplace; owners/admins may request others)
- `campus_area`
- `price_min`, `price_max`
- `ordering` — `-created_at` default
- `page`, `page_size`

Pagination: DRF page-number pagination, default page size 12, max 50.

### Messaging

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/conversations/` | Participant | Inbox |
| POST | `/conversations/` | Authenticated | Start or reuse thread with seller (listing + message) |
| GET | `/conversations/{uuid}/` | Participant | Thread header |
| GET | `/conversations/{uuid}/messages/` | Participant | Paginated messages |
| POST | `/conversations/{uuid}/messages/` | Participant | Send message |
| POST | `/conversations/{uuid}/read/` | Participant | Mark incoming as read |

Starting a conversation is how students **contact sellers**. Email and phone are not exposed.

### Reports

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/reports/` | Authenticated | Report listing or user |
| GET | `/reports/mine/` | Authenticated | Reporter’s own reports (no admin notes) |

### Administration (`/api/v1/admin/…`)

All require `role = ADMIN`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/stats/` | Counts: users, listings by status/category/type, open reports |
| GET/PATCH | `/admin/users/` | List/deactivate students |
| GET/PATCH | `/admin/listings/` | List all statuses; force `REMOVED` |
| GET/POST/PATCH | `/admin/categories/` | Manage categories |
| GET/PATCH | `/admin/reports/` | Review queue and resolution |

### Serializers and permissions (DRF)

- Separate serializers for create, public detail, owner detail, and admin.
- Public listing serializer: seller `id`, `display_name`, `campus_area`, avatar URL — **not** email, phone, student_id.
- Permissions: `IsAuthenticated`, `IsAdminRole`, `IsListingOwner`, `IsConversationParticipant`, `IsOwnerOrAdmin`.
- Object-level checks in `get_queryset()` (filter to what the user may see) **and** permission classes (block unsafe writes).

---

## 5. Frontend folder structure

```
frontend/
  src/
    app/
      router.tsx
      query-client.ts
      providers.tsx
    api/
      axios.ts              # base URL from VITE_API_BASE_URL
      types.ts
    features/
      auth/                 # login, register, session
      profile/
      listings/             # browse, filters, detail, create/edit, mine
      favorites/
      messages/
      reports/
      admin/                # users, listings, categories, reports, stats
    shared/
      components/
      hooks/
      forms/                # RHF + Zod schemas
      constants/            # enums mirroring backend
    styles/
      index.css             # Tailwind entry
  index.html
  vite.config.ts
  tailwind.config.ts
```

Libraries and where they sit:

| Library | Use |
| --- | --- |
| React Router | Page routes; nested admin routes |
| TanStack Query | Server state (listings, messages, admin tables) |
| Axios | HTTP; attach access token; refresh on 401 |
| React Hook Form + Zod | Client validation aligned with API rules |
| Lucide React | Icons only |
| Tailwind CSS | Styling |

Route sketch:

- `/login`, `/register`
- `/` marketplace browse
- `/listings/:id`
- `/listings/new`, `/listings/:id/edit`
- `/me`, `/me/listings`, `/me/favorites`
- `/messages`, `/messages/:conversationId`
- `/admin`, `/admin/users`, `/admin/listings`, `/admin/categories`, `/admin/reports`

Guards: authenticated layout; admin layout checks `role`.

---

## 6. Authentication architecture

### Identity

- SWUST-only: `email` must end with a domain from `ALLOWED_EMAIL_DOMAINS` (environment, e.g. `mails.swust.edu.cn`, `swust.edu.cn`).
- Unique `student_id` reduces duplicate accounts without official SSO.
- Default role `STUDENT`. Admins are promoted in the database / Django admin, not via public register.

### Tokens

- Access JWT: short-lived (15 minutes), sent as `Authorization: Bearer`.
- Refresh JWT: longer-lived (7 days).
- Secrets: `SECRET_KEY` and `SIMPLE_JWT` signing key from environment. Never hardcoded.

Preferred token storage for a defensible design:

1. Access token in **memory** (React state).
2. Refresh token in **HttpOnly + Secure + SameSite** cookie (Django sets it).

Acceptable simpler v1 if cookie auth is too heavy for the timeline: both tokens in memory/session storage, with XSS documented as a known risk. **Do not** put long-lived JWTs in localStorage if the cookie approach is implemented.

### Session on the client

- Axios interceptor retries once after refresh on 401.
- TanStack Query global `onError` for 401 → logout.
- Frontend never trusts `role` in the JWT alone for security; backend enforces every write. UI hides admin links using `/auth/me/` for UX only.

### Password rules

- Django password validators (length, common-password, numeric).
- HTTPS in production so credentials are not sent in clear text.

---

## 7. Main user flows

### Register / login

1. Student submits email, student ID, password, display name.
2. API validates SWUST domain, uniqueness, password policy.
3. Account created as `STUDENT`, `is_active=true`.
4. Login returns tokens; client stores session and loads `/auth/me/`.

### Profile

1. Student opens `/me`.
2. Can change display name, bio, campus area, phone, avatar.
3. Email and student ID are immutable after registration (admin can fix mistakes).

### Create listing

1. Authenticated student fills title, description, category, condition, transaction type, campus area, optional price/exchange/borrow notes.
2. Client Zod validation, then API serializer validation.
3. Upload 1–6 images to the listing image endpoint (type/size checked with Pillow).
4. Listing starts as `ACTIVE`.

### Browse / search / filter

1. Marketplace requests `GET /listings/?status=ACTIVE` plus search and filters.
2. Backend applies search, django-filter, and pagination.
3. Cards show title, first image, price (if any), type, condition, campus area.

### View detail

1. `GET /listings/{id}/` including images and public seller snapshot.
2. Actions: favorite, contact seller, report, edit (if owner).

### Favorite

1. `POST /favorites/` with listing id; unique constraint returns a clean 400 if duplicated.
2. `/me/favorites` lists favorites.

### Contact seller / message

1. From a listing, student starts a conversation (or reuses the existing pair+listing thread).
2. Both sides list threads, open a thread, send messages, mark read.
3. Polling via TanStack Query (e.g. 10–15s on the open thread) is enough without WebSockets.

### Sell / borrow / exchange completion (offline deal)

There is no payment API. The seller updates status when the campus handover happens:

- Sale → `SOLD`
- Borrow → `BORROWED` (optionally from `RESERVED`)
- Exchange → `EXCHANGED`
- No longer available → `CLOSED`

`RESERVED` means “agreed, not handed over yet”.

### Manage own listings

`/me/listings` filtered by seller = me. Owner may edit active listings, change status, and close. They cannot un-remove an admin `REMOVED` listing.

### Report

From listing or user profile: reason + details → `POST /reports/`. Reporter can see their report status, not admin notes.

---

## 8. Admin flows

Admins use the same SPA under `/admin`, calling `/api/v1/admin/*`.

### Manage students

- Search users by email, student ID, display name.
- View role, active flag, listing count.
- Deactivate (`is_active=false`) for abuse. Deactivated users cannot log in.

### Manage listings

- Filter all statuses including `REMOVED`.
- Force status `REMOVED` with `removed_reason`.
- Cannot impersonate sellers.

### Manage categories

- Create/rename/reorder/deactivate categories.
- Deactivating a category hides it from new listings; existing listings keep the FK.

### Review reports

- Queue of `OPEN` / `REVIEWING`.
- Open listing or user, then `RESOLVED` (with action: remove listing and/or deactivate user) or `DISMISSED`.
- `reviewed_by` and `reviewed_at` set automatically.

### Statistics

Single `GET /admin/stats/` payload:

- Total students (active/inactive)
- Listings by status, by category, by transaction type
- Open vs resolved reports
- New listings in last 7 days

No extra analytics product; these are SQL aggregates.

---

## 9. Security considerations

| Area | Rule |
| --- | --- |
| Secrets | `SECRET_KEY`, DB URL, JWT key, `ALLOWED_HOSTS`, CORS origins, email domains from env. `.env` gitignored. |
| AuthN | JWT on protected routes. Public: register, login, refresh only. |
| AuthZ | Object-level permissions. Students patch only their listings. Querysets scoped. Admin routes check `role`. |
| Privacy | Other users never receive email, phone, student_id. Messages only for participants. |
| Validation | Serializers + constraints. Zod on the client is UX, not security. |
| Uploads | Whitelist MIME + Pillow verify; size and count caps; random stored filenames; no SVG/HTML. |
| CORS | `django-cors-headers`; allow only `FRONTEND_ORIGIN`. Credentials only if cookie refresh is used. |
| Production Django | `DEBUG=False`, `ALLOWED_HOSTS`, TLS redirect, secure cookies, `CSRF_TRUSTED_ORIGINS` if cookies used. |
| SQL | ORM only; django-filter field allowlists — no raw query strings from clients. |
| Passwords | Hashed with Django defaults (PBKDF2 or configured hasher). |
| Rate limiting (nice-to-have) | Throttle login and register to reduce stuffing. Optional for v1, recommended before public campus use. |
| XSS | React default escaping; admin notes not rendered as HTML. |
| IDOR | UUID ids still require permission checks; UUIDs are not an access-control mechanism. |
| Soft delete | Preserve reports and listing history when removing content. |

Campus safety: `location_detail` is coarse on purpose. Handovers should be in public campus places; this is a product/UX note, not a backend feature.

---

## 10. Development phases

Each phase should leave the system runnable.

### Phase 0 — Foundations

- Split/create `frontend` (Vite, React, TypeScript, Tailwind, Router, Query, Axios) and `backend` (Django, DRF, Postgres, cors, env).
- Custom user model, JWT login/register/me, CORS, pagination class.
- No marketplace features yet.

### Phase 1 — Listings

- Categories seed + admin CRUD later.
- Listing CRUD, images, owner permissions, status field.
- Student “my listings”.

### Phase 2 — Discovery

- Search, filters (category, transaction type, condition), campus area, price range, pagination.
- Listing detail page.

### Phase 3 — Social actions

- Favorites.
- Conversations + messages (REST + polling).
- Contact seller from detail.

### Phase 4 — Trust and admin

- Reports.
- Admin users, listings, categories, report review, stats.
- Deactivate user / remove listing.

### Phase 5 — Hardening and demo polish

- Production settings checklist, upload limits, throttles if time.
- Empty/error states, filter UX, basic responsive layout.
- README with env vars and how to run **without Docker**.

**Suggested demo path:** register two students → post a textbook (SELL) and a bicycle (BORROW) → search/filter → favorite → message → seller marks SOLD → third user reports a listing → admin removes it and views stats.

---

## Configuration (environment)

Backend (examples of names, not values):

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DATABASE_URL`
- `CORS_ALLOWED_ORIGINS` / `FRONTEND_ORIGIN`
- `JWT_SIGNING_KEY` (or reuse `SECRET_KEY` only if documented)
- `ALLOWED_EMAIL_DOMAINS`
- `MEDIA_ROOT` / `MEDIA_URL`

Frontend:

- `VITE_API_BASE_URL`

---

## Implementation note

This document is the source of truth for the first implementation. Do not add payments, WebSockets, or extra modules unless the scope of this document is updated first.
