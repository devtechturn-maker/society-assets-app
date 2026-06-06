# Branch workflow

| Branch | Purpose | API default | EAS build |
|--------|---------|-------------|-----------|
| `local` | Daily work on your PC | `.env` → `http://10.0.2.2:8080` or LAN IP | None (Expo Go / dev client + Metro) |
| `feature/*` | New work — branch from `local` | Same as `local` | None |
| `development` | Hosted staging — dev client APK/IPA | Render (`eas.json` `development` profile) | `npm run build:android:dev` |
| `main` | Production store builds | Render (`production` profile) | `eas build --profile production` |

## Local (on `local` branch)

```bash
cp .env.example .env
# Edit EXPO_PUBLIC_API_URL for emulator (10.0.2.2) or phone (PC LAN IP)
npx expo start -c
```

## Staging device build (on `development` branch)

```bash
npm run build:android:dev
# or
npm run build:ios:dev
```

EAS injects `EXPO_PUBLIC_API_URL=https://society-assets-backend.onrender.com`. Local `.env` is excluded via `.easignore`.
