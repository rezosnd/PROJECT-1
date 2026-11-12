# Launch readiness — GetMyHospital / CityHealth (Bhubaneswar)

## Verdict: **pilot-ready with production paths wired** — finish ops checklist before public launch

The product stack is coherent for a **city pilot** (Express API + PostGIS + Redis + web + patient/doctor/ambulance Expo apps). Core care-matching, insurance networks, Care QR, and realtime desks are launch-shaped; public launch still needs secrets, ABDM mode, and live hospital ops.

### Ready now
- Multi-role auth (PATIENT / HOSPITAL_* / CITY_ADMIN / DOCTOR / AMBULANCE) with JWT + preregistration
- Live bed inventory, 15‑min holds, equipment, blood bank holds, doctor Care QR referrals
- **Insurance:** patient policies, hospital admin network CRUD (cashless, benefits, discount %), match ranking + badges
- CityHealth AI (server-side Gemini + safety rules + DB tools)
- SOS → nearby ambulances (PostGIS) → **first-come-first-serve accept** → patient sees assigned unit
- Reception desks: bed queue, blood desk, doctor referrals, emergency SOS, **insurance network**
- Live doctor directory from registered DOCTOR accounts (no fabricated demo specialists)
- Bhubaneswar hospital seed with public addresses / emergency phones + online ambulance fleet

### Must finish before public launch
1. **Secrets** — rotate JWT/SMTP/Cloudinary defaults; never ship `.env.example` secrets as production values
2. **Firebase** — add real `FIREBASE_SERVICE_ACCOUNT_JSON` (or Expo push credentials) for reliable background SOS alerts
3. **Hospital data ops** — live bed/equipment/blood/insurance must be maintained by hospital staff (seed ≠ live occupancy)
4. **Google OAuth** — production Android/iOS client IDs + ambulance/doctor app store builds
5. **ABDM** — still `ABDM_MODE=mock` unless sandbox/production credentials are configured
6. **Bootstrap staff** — set `SEED_BOOTSTRAP_STAFF=false` in production; pre-register real Gmails via City Admin
7. **Legal / clinical** — disclaimers present; still need counsel review for medical AI + emergency routing claims
8. **Observability** — production logging, on-call, rate limits tuned, backup/restore for Postgres

### Insurance ops (hospital admin)
1. Sign in as HOSPITAL_ADMIN / HOSPITAL_STAFF
2. Open **Hospital → Insurance**
3. Select insurers, set cashless, benefits, package discount %, plan label
4. Save — patients see coverage on match cards and hospital overview

### How to verify Care QR + insurance end-to-end
1. `npm run migrate:up && npm run seed` (runs migration `018_hospital_insurance_benefits`)
2. Patient profile → Care QR visible; Insurance editor with plan / member / policy
3. Doctor app scan → patient insurance listed → refer
4. Hospital dashboard Insurance tab → edit network → patient match shows Covered + discount badge
