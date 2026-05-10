# Deploy guide

## Architettura

| Componente    | Hosting    | Note                                                                                                  |
| ------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `apps/web`    | Vercel     | preview deploy automatico su PR                                                                       |
| `apps/screen` | Vercel     | secondo progetto Vercel separato                                                                      |
| `apps/server` | Railway    | bun runtime via `railway.toml` startCommand, healthcheck `/health`                                    |
| `apps/mobile` | EAS (Expo) | Development Build per dev, EAS Update OTA su `main`, EAS Build + TestFlight/Internal Testing per beta |

DB: Neon Postgres. In dev locale `DATABASE_URL` punta al branch dev di Neon (impostato in `apps/server/.env`); in produzione il server Railway si connette al Postgres add-on di Railway via `DATABASE_URL`.

## Workflow di sviluppo (single-dev, trunk-based)

`main` = produzione. Niente branch `staging`.

```
┌─ feat/qualcosa
│    push   → CI (lint, typecheck, test, e2e)
│           → Vercel preview URL (web + screen)
│    smoke test sul preview URL
│    squash merge su main
└─→ main → deploy automatico:
            • Vercel produce build di prod per web/screen
            • Railway redeploya il server
```

**Convention branch**: `feat/...`, `fix/...`, `chore/...`, `docs/...`, `refactor/...`.

I preview Vercel puntano allo stesso server Railway di produzione (un solo service). Per un single-dev senza utenti reali è un trade-off accettabile: i preview leggono/scrivono sul DB di prod. Quando arriveranno utenti, promuovere a un setup con server "staging" separato (vedi sezione "Promozione a staging dedicato" più sotto).

## 1. Vercel (apps/web e apps/screen)

Due progetti separati nel monorepo:

1. **Crea progetto** `karaoke-web`:
   - Import Git repository
   - Root Directory: `apps/web`
   - Framework Preset: Vite (auto-rilevato)
   - Environment variables (Production + Preview):
     - `VITE_SERVER_URL` = URL Railway pubblico (es. `https://api.karaoke.tld`)
2. **Crea progetto** `karaoke-screen` (identico, root `apps/screen`):
   - `VITE_SERVER_URL` = URL Railway pubblico
   - `VITE_PARTICIPANT_JOIN_URL` = URL public di `apps/web` + `/join` (es. `https://app.karaoke.tld/join`)
3. Push to `main` → production deploy. PR → preview URL automatica.

### Turbo Remote Cache (opzionale)

Per accelerare i build su Vercel:

1. Vercel Dashboard > Settings > Tokens → crea Turbo token
2. In ogni progetto Vercel imposta env vars:
   - `TURBO_TOKEN`
   - `TURBO_TEAM`

## 2. Railway (apps/server)

Il deploy usa `railway.toml` in root del repo (start command Bun, niente Dockerfile).

1. **Crea progetto** Railway, link al repo
2. **Service**: il `railway.toml` punta a `bun apps/server/src/index.ts`. Aggiunge anche un Postgres add-on dal dashboard.
3. **Variables**:
   - `DATABASE_URL` (Postgres add-on Railway, oppure Neon Direct connection)
   - `BETTER_AUTH_SECRET` (32+ random bytes — rigenerare rispetto al dev)
   - `BETTER_AUTH_URL` = URL pubblico Railway (es. `https://api.karaoke.tld`)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (vedi sezione 5)
   - `CORS_ORIGIN` = lista comma-separated di **tutti** gli origin Vercel autorizzati: `https://app.karaoke.tld,https://screen.karaoke.tld` + eventualmente i domain `*.vercel.app` dei preview
   - `PORT` viene fornito da Railway, il server lo legge

> **Cookie cross-origin**: quando `BETTER_AUTH_URL` è https, Better Auth applica automaticamente `SameSite=None; Secure; Partitioned` ai cookie di sessione (vedi `packages/auth/src/server.ts`). Necessario perché web/screen su Vercel sono su origin diverso dal server.

## 3. EAS (apps/mobile)

Setup una tantum:

```bash
cd apps/mobile
npx eas-cli@latest init           # richiede login Expo, crea projectId
npx eas-cli@latest build:configure
```

**Profili in `eas.json`** (già configurati):

- `development` → Development Build (installabile su dispositivo, supporta moduli nativi come `expo-secure-store`)
- `preview` → internal distribution (link installabile)
- `production` → store-ready

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

Workflow: `.github/workflows/ci.yml`. Gira su ogni PR e push su `main`.

**Jobs**:

- `lint-typecheck-test`: lint + typecheck + Vitest su tutti i workspace
- `e2e-web`: Playwright chromium su `apps/web` (build + `vite preview`, browser cachati)

**Secrets opzionali** (Turbo Remote Cache, condiviso con Vercel):

- `TURBO_TOKEN`
- `TURBO_TEAM`

## 5. Google OAuth

Single client ID con multi-redirect (un solo Google Cloud project). In Google Cloud Console > APIs & Services > Credentials:

- **Authorized JavaScript origins**:
  - `http://localhost:3000` (dev)
  - URL Railway prod (es. `https://api.karaoke.tld`)
- **Authorized redirect URIs**:
  - `http://localhost:3000/api/auth/callback/google` (dev)
  - `<URL Railway>/api/auth/callback/google` (prod)

## 6. Domini (riferimento)

Quando avrai un dominio:

| Servizio         | Subdomain            |
| ---------------- | -------------------- |
| Web partecipanti | `app.karaoke.tld`    |
| Screen TV        | `screen.karaoke.tld` |
| API server       | `api.karaoke.tld`    |

Configurali su Vercel (web/screen) e Railway (api), poi aggiorna `BETTER_AUTH_URL`, `CORS_ORIGIN`, `VITE_SERVER_URL`, `VITE_PARTICIPANT_JOIN_URL` e i redirect Google.

## Promozione a staging dedicato (futuro)

Quando avrai utenti reali e non vorrai più toccare il DB prod dai preview:

1. **Neon**: crea un branch `staging` (gratis) → ottieni un secondo `DATABASE_URL`
2. **Railway**: crea un secondo service `karaoke-server-staging` linkato al branch `staging` del repo, con env vars proprie (`DATABASE_URL` del branch Neon, `BETTER_AUTH_URL` = URL staging, ecc.)
3. **Vercel**: in ogni progetto, configura "Environment Variables" per il branch `staging` puntando al server staging; lascia `Production` invariato
4. **Google OAuth**: aggiungi i redirect URI di staging al client esistente (oppure crea un secondo client)
5. **Workflow**: feature → PR su `staging` → merge → smoke su staging → PR `staging`→`main` → prod
