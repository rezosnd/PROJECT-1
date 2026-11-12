# GetMyHospital Doctor

Separate Expo app for clinicians to **scan a patient’s Care QR**, view clinical + insurance details, and **refer** them to another hospital / department with an optional **15-minute bed hold** (not a permanent booking).

## Setup

```bash
cd apps/doctor
npm install
npx expo start
```

Pre-register the doctor Gmail via City Admin (`POST /admin/staff` with `role: "DOCTOR"`) or use seed accounts:

- `doctor.aiims@gmail.com`
- `doctor.kims@gmail.com`
- `doctor.refer@gmail.com`

## Patient flow

1. Patient completes profile (including insurance) on mobile/web.
2. Patient opens **Profile → Care QR**.
3. Doctor opens this app → **Scan QR** → review → **Refer**.

## API

- `POST /referrals/scan` `{ qrPayload }`
- `POST /referrals` create referral (+ hold)
- `GET /referrals/me`
- `GET /referrals/hospitals/:id/departments`
