# Branch workflow

| Branch | Purpose | API default | EAS build |
|--------|---------|-------------|-----------|
| **`local`** | Daily work on your PC | `.env` → `http://10.0.2.2:8080` or LAN IP | **Blocked** — stay on this branch for coding |
| `feature/*` | New work — branch from `local` | Same as `local` | Blocked |
| **`development`** | Hosted staging — **EAS builds only from here** | Render (`eas.json`) | `npm run build:android:dev` |
| `main` | Production store builds | Render (`production` profile) | `eas build --profile production` |

## Daily work (stay on `local`)

```bash
git checkout local
cp .env.example .env   # first time only
npx expo start -c
```

| Device | Set in `.env` |
|--------|----------------|
| Physical phone | `http://192.168.1.34:8080` |
| Android emulator | `http://10.0.2.2:8080` |
| iOS Simulator | `http://localhost:8080` |

`.env` is gitignored — it never merges to `development`.  
`src/config/env.ts`, `eas.json`, and `app.json` are protected by `.gitattributes` on `development`.

## Create a device build (must use `development` branch)

EAS uploads **your current git branch**. Builds from `local` would point at localhost — blocked by `scripts/ensure-development-branch.mjs`.

```bash
# 1. Merge your work into development
git checkout development
git merge local                    # or feature/my-change
git push origin development

# 2. Build (only works on development branch)
npm run build:android:dev
# or
npm run build:ios:dev
# or iOS Simulator:
npm run build:ios:sim

# 3. Go back to local for daily work
git checkout local
```

EAS injects `EXPO_PUBLIC_API_URL=https://society-assets-backend.onrender.com`.  
Local `.env` is excluded via `.easignore`.

## What each build uses

| You run | Branch required | Backend URL |
|---------|-----------------|-------------|
| `npm start` | `local` | `http://10.0.2.2:8080` or `.env` |
| `npm run build:android:dev` | **`development`** | `https://society-assets-backend.onrender.com` |
