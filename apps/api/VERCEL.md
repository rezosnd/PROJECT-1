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

## 3. Google Console

Authorized **JavaScript origins** (not LAN IPs):

- `https://project1-api.vercel.app`
- `http://localhost:5000` (local only)

## 4. Clients

Web / mobile already point at:

- API: `https://project1-api.vercel.app/api/v1`
- Health check: `https://project1-api.vercel.app/health`

## Limits on Vercel

- **Socket.IO realtime will not work** on serverless (use polling / refetch).
- Background bed-hold / snapshot jobs do **not** run on Vercel — keep a always-on host (Railway/Render/Fly) if you need them.
