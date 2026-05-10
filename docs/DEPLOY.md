# Deploy guide

Last updated: M9.

## Architettura

| Componente    | Hosting    | Note                                                                                                  |
| ------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `apps/web`    | Vercel     | preview deploy su PR                                                                                  |
| `apps/screen` | Vercel     | secondo progetto Vercel separato                                                                      |
| `apps/server` | Railway    | container Bun via Dockerfile, healthcheck `/health`                                                   |
| `apps/mobile` | EAS (Expo) | Development Build per dev, EAS Update OTA su `main`, EAS Build + TestFlight/Internal Testing per beta |

DB: Neon Postgres (gia' configurato in `apps/server/.env` per dev locale; in produzione settare `DATABASE_URL` come variabile Railway).

## 1. Vercel (apps/web e apps/screen)

Setup una tantum, due progetti separati nel monorepo:

1. **Crea progetto** `karaoke-web`:
   - Import Git repository
   - Root Directory: `apps/web`
   - Framework Preset: Vite (auto-rilevato)
   - Build Command e Output Directory sono in `apps/web/vercel.json` (no override)
   - Environment variables:
     - `VITE_SERVER_URL` = `https://api.karaoke.tld` (URL Railway pubblico)
2. **Crea progetto** `karaoke-screen` (identico, root `apps/screen`):
   - `VITE_SERVER_URL` = `https://api.karaoke.tld`
   - `VITE_PARTICIPANT_JOIN_URL` = `https://app.karaoke.tld/join`
3. Push to `main` -> production deploy. PR -> preview URL automatica.

### Turbo Remote Cache (opzionale ma consigliato)

Per accelerare i build di Vercel (sfrutta cache condivisa):

1. Vercel Dashboard > Settings > Tokens -> crea Turbo token
2. In ogni progetto Vercel imposta env vars:
   - `TURBO_TOKEN` = ...
   - `TURBO_TEAM` = nome team Vercel

## 2. Railway (apps/server)

1. **Crea progetto** Railway, link al repo
2. **Service**: usa Dockerfile (`apps/server/Dockerfile`) — Railway lo rileva via `railway.json` in root del service
3. **Variables**:
   - `DATABASE_URL` (Neon Direct connection)
   - `BETTER_AUTH_SECRET` (32+ random bytes; rigenerare per produzione)
   - `BETTER_AUTH_URL` = URL pubblico Railway
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (registra anche redirect URI prod su Google Cloud Console)
   - `CORS_ORIGIN` = `https://app.karaoke.tld,https://screen.karaoke.tld`
   - `PORT` = `3000` (Railway lo passa automaticamente; il server ne fa fallback)
4. Public domain via Railway Settings -> Domains

## 3. EAS (apps/mobile)

Setup una tantum:

```bash
cd apps/mobile
npx eas-cli@latest init           # richiede login Expo, crea projectId
npx eas-cli@latest build:configure
```

**Profili in `eas.json`** (gia' configurati):

- `development` -> Development Build (installabile su dispositivo, supporta moduli nativi come `expo-secure-store`)
- `preview` -> internal distribution (link installabile)
- `production` -> store-ready

**Comandi tipici**:

```bash
# Build dev one-time per dispositivo
npx eas-cli build --profile development --platform android   # o ios

# OTA update su main (rapido, niente rebuild)
npx eas-cli update --channel production

# Build production per store
npx eas-cli build --profile production --platform all
npx eas-cli submit --profile production --platform all
```

## 4. GitHub Actions CI

Workflow gia' presente: `.github/workflows/ci.yml`

**Jobs**:

- `lint-typecheck-test`: lint + typecheck + Vitest, su tutti i workspace
- `e2e-web`: Playwright chromium su `apps/web`

**Secrets opzionali** (per Turbo Remote Cache, condiviso con Vercel):

- `TURBO_TOKEN`
- `TURBO_TEAM`

CI gira su PR e push to main. Branching strategy: `main` = production, no staging branch.

## 5. Domini (riferimento)

Quando hai un dominio:

| Servizio         | Subdomain            |
| ---------------- | -------------------- |
| Web partecipanti | `app.karaoke.tld`    |
| Screen TV        | `screen.karaoke.tld` |
| API server       | `api.karaoke.tld`    |

Aggiorna anche **Google OAuth Client** > Authorized redirect URIs:

- `http://localhost:3000/api/auth/callback/google` (dev)
- `https://api.karaoke.tld/api/auth/callback/google` (prod)
