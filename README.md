# GetMyHospital (CityHealth)

Emergency health grid — live bed matching, ABHA, **holds** (not permanent bookings), insurance-aware ranking, **blood banks**, and **doctor Care QR referrals**.

## Apps

| App | Path | Purpose |
|-----|------|---------|
| API | `apps/api` | Express + Postgres/PostGIS |
| Web | `apps/web` | Patient + hospital + city admin portal |
| Mobile | `apps/mobile` | Patient Expo app (beds, blood, Care QR) |
| Doctor | `apps/doctor` | Scan Care QR → refer / hold |

## End-to-end flow

1. **Patient** onboarding → clinical profile + **insurance** (or self-pay).
2. Matching by distance, specialty/condition, beds, equipment, insurance.
3. **Hold bed (15 min)** — never a permanent booking.
4. **Blood bank** → find stock by group/component → **30-min hold** → hospital **Blood desk** approves / issues after crossmatch.
5. **CityHealth AI** (`/ai`) — grounded chat + emergency 112 + live hospital/bed/equipment tools (Gemini server-side; works offline with fallback).
6. Profile **Care QR** for doctors.
7. **Doctor app** → scan → refer to hospital/department → optional bed hold.

## Setup

```bash
npm run migrate:up         # 014 referrals · 015 blood · 016 CityHealth AI
npm run seed               # hospitals, blood stock, AI knowledge, doctors
# Optional: set GEMINI_API_KEY in apps/api/.env (never in Expo/Vite)
npm run dev
npm run dev:web
npm run dev:mobile
npm run dev:doctor
```

| Feature | Web | Mobile / apps |
|---------|-----|----------------|
| CityHealth AI | `/ai` | `/ai` from Home |
| SOS ambulance (FCFS) | `/sos` | `/sos` + Home **SOS** |
| Blood bank | `/blood` | Blood tab |
| Equipment | Hospital detail | Hospital detail |
| Doctor referrals desk | `/hospital?tab=referrals` | Doctor app |
| Emergency SOS desk | `/hospital?tab=sos` | Ambulance app |
| Ambulance fleet app | — | `npm run dev:ambulance` |

```bash
npm run migrate:up   # includes 017 SOS / ambulance
npm run seed         # BBSR hospitals + 8 online ambulances
npm run dev:ambulance
```

Ambulance login (after seed): pre-register Gmail e.g. `ambulance1.bbsr@gmail.com` then Google sign-in with role AMBULANCE.

Push: Expo Push works out of the box; set `FIREBASE_SERVICE_ACCOUNT_JSON` for native FCM.

Docs: `apps/api/docs/cityhealth-ai.md` · Launch notes: `docs/LAUNCH_READINESS.md`
