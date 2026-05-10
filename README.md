# karaoke

Realtime karaoke queue manager. Host + partecipanti + tabellone TV con lyrics LRCLIB sync DJ-driven.

Monorepo Turbo + pnpm:

- `apps/server` — Bun + Hono + Socket.IO 4 + Better Auth + Drizzle (Postgres/Neon)
- `apps/web` — Vite + TanStack Router + Tailwind v4 + shadcn (host + partecipanti)
- `apps/screen` — Vite + TanStack Router (tabellone TV/proiettore con lyrics scroll)
- `apps/mobile` — Expo SDK 54 + Expo Router (partecipanti)
- `packages/*` — protocol (Zod 4), db (Drizzle), store (TanStack), socket-client (typed), ui (shadcn), auth (Better Auth), eslint-config, typescript-config, tailwind-config

## Quick start

```bash
pnpm install
cp apps/server/.env.example apps/server/.env  # poi compila con DATABASE_URL Neon + GOOGLE_CLIENT_*
pnpm --filter @workspace/server db:push       # applica schema Drizzle a Neon
pnpm dev                                       # tutto in parallelo via turbo
```

- Server: http://localhost:3000 (`/health`, `/api/auth/*`, `/api/sessions`, `/api/catalog`, `/api/screens`)
- Web: http://localhost:5173
- Screen: http://localhost:5174
- Mobile: `pnpm --filter @workspace/mobile start` per Expo Dev Client

Per agenti AI (Claude Code): vedi `CLAUDE.md`. Per il deploy: `docs/DEPLOY.md`.

## Verifiche

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @workspace/web test:e2e
```
