# Society Assets — Expo (society app)

React Native app for **society users only** (chairman, treasurer, member, auditor). **Product owner** accounts are rejected at login (use the web dashboard).

## Prerequisites

- **Node.js** LTS (18+)
- **npm** or **yarn**
- **Expo Go** on your Android phone ([Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)), or **Android Studio** emulator
- Your **Spring Boot** backend (`society-assets`) running and a society user to test with

## API URL (important)

| Where you run the app                                  | Set `EXPO_PUBLIC_API_URL` to                                     |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| Android **emulator** on same PC as API                 | `http://10.0.2.2:8080` (default in `src/config/env.ts` if unset) |
| **Expo Go** on a **physical phone** (same Wi‑Fi as PC) | `http://<YOUR_PC_LAN_IP>:8080` e.g. `http://192.168.1.39:8080`   |

The app resolves the base URL in this order: **`EXPO_PUBLIC_API_URL`** (`.env`) → **`expo.extra.apiBaseUrl`** in `app.json` → emulator default `http://10.0.2.2:8080`. A wrong IP causes **Login failed / Network error** in Expo Go.

Create a `.env` file in this folder (copy from `.env.example`):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.39:8080
```

Restart Expo after changing `.env` (`Ctrl+C`, then `npx expo start` again).

Ensure Windows Firewall allows inbound **8080** (or your API port) on **Private** networks when testing from a phone.

## Run from scratch (Windows)

1. **Start the backend** (from repo root or `society-assets`):

   ```bash
   cd society-assets
   .\mvnw.cmd spring-boot:run
   ```

   Confirm `http://localhost:8080` responds (e.g. browser or curl).

2. **Install mobile dependencies** (once):

   ```bash
   cd society-assets-expo
   npm install
   ```

3. **Configure API URL** (phone on Wi‑Fi): create `.env` with `EXPO_PUBLIC_API_URL=...` as above.

4. **Start Expo** (if the phone only spins when scanning the QR, use **tunnel** — see Troubleshooting):

   ```bash
   npx expo start
   ```

   Or: `npm run start:tunnel` (works through Expo’s servers when your phone and PC can’t talk on the local network).

5. **Open on Android**
   - **Expo Go (recommended first):** scan the QR code from the terminal (use Expo Go app’s scanner). Same Wi‑Fi as the PC.
   - **Emulator:** press `a` in the Expo terminal, or run `npm run android` with an emulator running.

6. **Sign in** with a society user (not product owner). You should see **Society Overview** with all modules (Dashboard, Maintenance, Expenses, etc.).

## Project layout

- `App.tsx` — Login / **SocietyShell** (no React Navigation — avoids Expo Go + Android native crashes)
- `src/screens/SocietyShell.tsx` — drawer menu + horizontal module chips (matches web sidebar on mobile)
- `src/screens/modules/` — Dashboard, Maintenance, Expenses, Other Income, Members, Contracts, Reports, Settings, Support
- `src/config/env.ts` — API base URL
- `src/crypto/rsaEncrypt.ts` — RSA password encryption (must match web app + backend)
- `src/services/storage.ts` — session in **`expo-secure-store`**
- `src/services/api.ts` — same society APIs as the Angular `SocietyDashboardService`
- `src/screens/LoginScreen.tsx` — login (matches web Member Portal styling)

## iOS later

Expo supports iOS through Expo Go on a physical iPhone or a Mac build. The same codebase applies; you will repeat URL/network steps for the iPhone’s network path to your API.

## Troubleshooting

- **Expo Go stuck on loading / spinner after scanning QR:** The phone cannot reach Metro on your PC (common on hotspot, guest Wi‑Fi, or strict routers).
  1. Stop Expo, then run: `npm run start:clear` or `npx expo start --clear`.
  2. Use tunnel mode: `npm run start:tunnel` (or `npx expo start --tunnel`), wait until the QR updates, scan again. First run may ask to install `@expo/ngrok` — accept.
  3. Same Wi‑Fi as the PC (not “guest” network), or try **USB** + `adb reverse` for advanced setups.
  4. Allow **Node.js** / **Expo** through Windows Firewall when prompted (ports used include **8081**, **19000** range).
- **Network request failed / timeout:** wrong `EXPO_PUBLIC_API_URL`, firewall, or phone not on same LAN as PC.
- **Cleartext HTTP blocked:** `app.json` sets `android.usesCleartextTraffic` for `http://` APIs. For production, use HTTPS.
- **Login 401:** wrong password or RSA keys out of sync with backend (use same public key as web).
