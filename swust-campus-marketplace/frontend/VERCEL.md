# Vercel frontend deploy notes

## Safe environment variables only

Set in **Vercel → Project → Settings → Environment Variables**
(Production + Preview):

| Name | Value | Safe for browser? |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `https://api.example.com/api/v1` | Yes (public API base) |

**Never** add to Vercel:

- `SECRET_KEY`, `DATABASE_URL`, `JWT_SIGNING_KEY`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Any Django / Postgres / S3 secrets

Vite inlines `VITE_*` into the client bundle — treat them as public.

## Deploy commands

From `frontend/`:

```bash
npx vercel login
npx vercel link
npx vercel env add VITE_API_BASE_URL production
# paste: https://api.example.com/api/v1
npx vercel --prod
```

HTTPS is provided by Vercel automatically on `*.vercel.app` (and custom domains).

SPA routing is configured in `vercel.json` (rewrite non-asset paths to `index.html`).
