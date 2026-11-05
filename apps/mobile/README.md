# LifeLink Mobile — Live Bed & Equipment Availability with ABHA

A production-grade React Native & Expo mobile application for patients, developed as a Distributed Systems prototype for KIIT. Features condition-based bed matching, live equipment telemetry, Poisson surge forecasts, Ayushman Bharat (ABHA / ABDM) integration, and offline resilience.

> **Important Emergency Notice**: LifeLink is a prototype and not a certified medical device. In an emergency, dial **112**.

---

## 1. Quick Start & Setup

### Prerequisites
- Node.js 20+
- Android Studio with Android SDK (API 34) & ADB or physical Android test device
- EAS CLI: `npm install -g eas-cli`

### Installation
```bash
# Navigate to mobile app directory
cd apps/mobile

# Install dependencies
npm install

# Generate native android/ios folders with configured plugins
npx expo prebuild --clean
```

### Running the App
```bash
# Option A: Start development build on connected Android device / emulator
npx expo run:android

# Option B: Start Expo Dev Client bundler server
npx expo start --dev-client
```

### Mock Mode vs Real Backend API
The app can run completely standalone without a live backend:
- In `apps/mobile/.env`:
  ```bash
  # Run completely standalone with mock data and 4s socket bed fluctuation simulator:
  EXPO_PUBLIC_USE_MOCKS=true

  # Connect to local or production API and live Socket.IO gateway:
  EXPO_PUBLIC_USE_MOCKS=false
  ```

---

## 2. Google Cloud OAuth & Identity Configuration

LifeLink strictly uses Google OAuth 2.0. No phone numbers, passwords, or OTPs are stored.

### Step 1: Configure OAuth Consent Screen
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project (e.g. `lifelink-cityhealth`).
3. Navigate to **APIs & Services** > **OAuth consent screen**.
4. Choose **External** User Type, fill in app name (*LifeLink*), and developer contact email.
5. Add scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
6. Under **Test Users**, add your Gmail test account(s).

### Step 2: Create OAuth 2.0 Client IDs
Create **three separate Client IDs** under **Credentials**:

1. **Web Application Client ID**:
   - Authorized JavaScript origins: `http://localhost:5173`, `http://localhost:8080`
   - Copy client ID to `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

2. **Android Client ID**:
   - Package name: `com.lifelink.cityhealth`
   - Obtain debug SHA-1 fingerprint via PowerShell:
     ```powershell
     keytool -list -v -keystore $HOME/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
   - Copy client ID to `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.

3. **iOS Client ID**:
   - Bundle Identifier: `com.lifelink.cityhealth`
   - Copy client ID to `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.

---

## 3. Testing Against Local PC LAN IP & Firewall Configuration

When running on a physical phone on the same Wi-Fi network:

1. **Find your PC LAN IP**:
   ```powershell
   ipconfig
   # Look for IPv4 Address under Wireless LAN adapter (e.g. 192.168.1.100)
   ```

2. **Allow Node / API Port through Windows Firewall**:
   ```powershell
   netsh advfirewall firewall add rule name="LifeLink API 8080" dir=in action=allow protocol=TCP localport=8080
   ```

3. **Configure Environment**:
   In `apps/mobile/.env`:
   ```bash
   EXPO_PUBLIC_API_URL=http://192.168.1.100:8080/api/v1
   EXPO_PUBLIC_SOCKET_URL=http://192.168.1.100:8080
   ```

4. **Cleartext Traffic**:
   `app.config.ts` automatically configures `usesCleartextTraffic: true` via `expo-build-properties` so Android allows plain HTTP requests to local IPs during development.

---

## 4. Click-by-Click QA Walkthrough

1. **Splash & Language Selection**:
   - Launch app. The Splash screen opens with language options: English, हिन्दी, ଓଡ଼ିଆ.
   - Tap **ଓଡ଼ିଆ**: verify UI switches immediately to Odia script.
   - Tap **English** and tap **Continue**.

2. **Google OAuth Login Screen**:
   - Verify circular outlined back button, bold "Login" title, and muted subtitle.
   - Tap **"Continue with Google"** (or use the Demo Persona Switcher pill).
   - Upon verification, JWT tokens are stored in `expo-secure-store` and you land on the Home tab.

3. **Condition Search & Autocomplete**:
   - In the search bar, type `str`.
   - Within 200 ms, **Acute Ischemic Stroke** appears with primary ward (ICU) and urgency level (5/5).
   - Select it. Adjust the severity chips to **Level 5 - Critical ICU**.
   - Tap **"Use my location"** (grants permission and calculates GPS coordinates).
   - Tap **"Find Beds Now"**.

4. **Results (Split List & Map)**:
   - Results list displays matching hospitals (AIIMS, SUM, KIMS) sorted by proximity and availability.
   - Notice the **score pill** (e.g. `94% Score`), ETA, distance, and live bed count chip (`4 ICU free now`).
   - Notice the **Poisson prediction narrative**: *"82% chance of a free bed in 3h based on live discharge velocity"*.
   - Tap the **Filters** button: adjust radius or toggle **24x7 Emergency Facilities Only**.
   - Expand the **"Not suitable"** section to review excluded facilities and clinically grounded refusal reasons.

5. **Hospital Detail & Real-Time Sync (< 2s)**:
   - Tap **"Details"** on AIIMS Bhubaneswar.
   - Toggle between **Beds**, **Equipment**, and **Overview** tabs.
   - Open the web Hospital Dashboard on your computer (`/hospital`) and increment occupied ICU beds.
   - In the mobile app, observe the ward counter pulse and update within **< 2 seconds**.
   - Review the SVG **Poisson Bed Surge Projection** mini-chart showing +1h, +3h, +6h forecast curves.

6. **15-Minute Bed Hold Reservation**:
   - Tap **"Request 15-Min Bed Hold"**.
   - Select urgency (*Immediate*), add symptoms note, leave **"Share Linked ABHA Profile"** checked.
   - Submit: you are routed to **My Requests**.
   - Verify the live **15-minute countdown clock** ticking down on the active hold.
   - Tap **"Cancel Hold"**: confirm in the modal; the hold is revoked and the bed is released back to the hospital.

7. **Equipment Finder**:
   - Tap the **Equipment** tab in the bottom bar.
   - Filter by **Ventilators**, **CT Scanners**, or **MRI Systems**.
   - Review live statuses (`Ready`, `In Use`, `Maintenance`) and projected return times.

8. **ABHA (Ayushman Bharat) Flow**:
   - Tap the **Profile** tab in the bottom bar.
   - Notice the prominent **"Sandbox / Mock"** badge.
   - In **Create New ABHA**: enter mock 12-digit Aadhaar `123456789012`.
   - Submit: verify Aadhaar is cleared from the text input immediately.
   - Enter mock OTP `123456`.
   - The Ayushman Bharat Health Card renders with masked ABHA ID `XX-XXXX-XXXX-4412`, full name, and simulated QR code.
   - Tap **"Unlink"**: confirm dialog; credentials are permanently purged.

9. **Offline Resilience & Airplane Mode**:
   - Turn on **Airplane Mode** on your phone.
   - Verify the top orange banner appears: **"Offline — showing cached telemetry"**.
   - Return to the Results screen: cached results open instantly with last available data.
   - Turn Airplane Mode off: live Socket.IO connection reconnects and the banner dismisses.

10. **Emergency 112 Strip & Red Button**:
    - Tap the red **"Call 112"** button on the Home screen header or the bottom emergency strip.
    - Verify your phone's dialer opens with `112` ready to call.

