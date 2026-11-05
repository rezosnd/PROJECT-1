# Deploy API on Vercel

The live URL `https://project1-api.vercel.app` was returning **500 FUNCTION_INVOCATION_FAILED** because this API is a long-running Express + Socket.IO process. Vercel needs the serverless entry in `api/index.js` (added) and **Root Directory = `apps/api`**.

## 1. Project settings

- Framework: Other
- Root Directory: `apps/api`
- Build Command: leave empty (or `echo ok`)
- Output: not used (serverless function)

## 2. Environment variables (Vercel → Settings → Environment Variables)

Copy from local `apps/api/.env` at minimum:

| Key | Notes |
|-----|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon pooled URL (`…-pooler…` + `sslmode=require`) |
| `DATABASE_POOL_MIN` | `0` |
| `DATABASE_POOL_MAX` | `3` |
| `REDIS_URL` | Optional. If missing/local, API uses memory rate-limit |
| `JWT_ACCESS_SECRET` | Strong secret |
| `JWT_REFRESH_SECRET` | Strong secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_WEB_CLIENT_ID` | Web OAuth client |
| `PUBLIC_API_ORIGIN` | `https://project1-api.vercel.app` |
| `CORS_ORIGINS` | Your web URLs, e.g. `http://localhost:5173,https://YOUR-WEB.vercel.app` |
| `ABDM_*` | Same as local |
| `CLOUDINARY_*` / `SMTP_*` | Same as local |

## 3. Google Console + Expo Go (fixes “Access blocked / request is invalid”)

Mobile login uses **authorization code + PKCE** (not `id_token` implicit).

Web client → add:

**Authorized redirect URIs** (exact)
- `https://project1-api.vercel.app/api/v1/auth/google/mobile-callback`

**Authorized JavaScript origins**
- `https://project1-api.vercel.app`

**OAuth consent → Testing** → add your Gmail as a **Test user**.

**Vercel → Environment variables**
- `GOOGLE_WEB_CLIENT_ID` = Web client ID
- `GOOGLE_CLIENT_SECRET` = Web client **secret** (required for code→token exchange)
- `PUBLIC_API_ORIGIN` = `https://project1-api.vercel.app`

Do **not** add LAN IPs or `exp://` URLs in Google Console.

## 4. Clients

Web / mobile already point at:

- API: `https://project1-api.vercel.app/api/v1`
- Health check: `https://project1-api.vercel.app/health`

## Live bed counts (near‑instant without Socket.IO)

Vercel **cannot** keep Socket.IO connections open. Live beds use:

1. **SSE** `GET /api/v1/events?hospitalId=` (Redis pub/sub across instances when `REDIS_URL` is set)
2. **300ms ETag poll** `GET /hospitals/:id/beds` → **304** if unchanged (almost free)

Set a working `REDIS_URL` (e.g. Upstash / Redis Cloud allowlist Vercel) for push over SSE.

True **0.000 ms** is impossible over the internet. Staff who adjust a ward see the new count in the API response immediately; other clients update within ~0.3s (poll) or faster via SSE.

For classic Socket.IO (~50–200ms), also run this API on Railway/Render/Fly (long‑lived Node).

## Limits on Vercel

- **Socket.IO** does not run on serverless (clients auto‑skip it for `*.vercel.app`).
- Background bed-hold / snapshot jobs do **not** run on Vercel — keep an always-on host if you need them.
