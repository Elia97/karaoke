# Claude Code instructions — karaoke

This file is read automatically by Claude Code when working in this repository. It encodes the **binding rules** of the project plus the conventions and commands needed to be productive.

The full design rationale lives in `~/.claude/plans/devo-iniziare-il-refactor-effervescent-lollipop.md`.

---

## Binding project rules

These rules override defaults. Apply them on every change.

1. **Early-stage / no production users.** The app is not deployed to real users yet. Take advantage: breaking changes are free, no migration scripts needed, no backward-compat shims, no rollback feature flags. Schema changes go via `drizzle-kit push --force` while there is no real client data.

2. **No dead code, ever.** Every feature/fix that leaves code unused removes it the same commit — unused functions, files, exports, dependencies, `// removed` / `// legacy` comments. Don't keep code "in case it's needed later". If it isn't called now, it's deleted.

3. **Professional refactor with every feature.** Each feature is also a chance to improve the surrounding code (Boy Scout Rule, proactively). Naming, module segmentation, deduplication, type-safety tightening — fair game when you touch an area. Don't ship features without leaving the area cleaner than you found it.

---

## Stack overview

```
~/karaoke/                 monorepo (pnpm 10 + Turbo 2 + Node 22)
├── apps/
│   ├── server/            Bun runtime + Hono + Socket.IO 4 + Better Auth (Google OAuth)
│   ├── web/               Vite + React 19 + TanStack Router + Tailwind v4 + shadcn (host + participant UI)
│   ├── screen/            Vite + React 19 + TanStack Router (tabellone TV/proiettore)
│   └── mobile/            Expo SDK 54 + Expo Router + expo-secure-store (participant native)
└── packages/
    ├── protocol/          Zod 4 schemas + types (commands, events, domain, handshake, errors, version)
    ├── db/                Drizzle ORM schema (Postgres-only, Neon)
    ├── store/             TanStack Store + applyEvent + persistence adapter
    ├── socket-client/     TypedClient wrapper su socket.io-client
    ├── ui/                shadcn/ui (web/screen)
    ├── auth/              Better Auth config (server + client SDK)
    ├── eslint-config/     ESLint flat presets (base, node, react, tanstack, expo)
    ├── typescript-config/ tsconfig presets (base, library, react-app, bun-app)
    └── tailwind-config/   Tailwind v4 design tokens condivisi
```

Persistence: Postgres (Neon) via Drizzle. In-memory hot state per sessione nel server, write-through.

---

## Code conventions

- **Quote style:** double quotes (Prettier default). Don't bikeshed; the pre-commit hook normalises.
- **No semicolons:** Prettier default. Same.
- **Trailing commas:** ES5.
- **Comments:** default to none. Only when WHY is non-obvious. No "what" comments; identifiers should explain themselves.
- **Errors:** typed (subclasses of `Error` like `ActiveSongError`, `ForbiddenError`); the gateway translates them to `ErrorCode` enum from `@workspace/protocol/errors`.
- **State changes from server events:** apply via `karaokeStore.applyEvent(event)`. Don't mutate the store directly from UI handlers — only via socket commands that emit events.
- **Types end-to-end:** Zod schemas in `packages/protocol` are the single source of truth. Use `z.infer<typeof X>` for the TS type. Never duplicate domain shapes.

---

## Common commands

All commands run from the repo root.

```bash
# install
pnpm install

# dev (turbo, all workspaces in parallel)
pnpm dev

# checks
pnpm typecheck
pnpm lint
pnpm test            # unit tests (Vitest)

# E2E (Playwright on apps/web)
pnpm --filter @workspace/web test:e2e

# server
pnpm --filter @workspace/server dev      # bun --watch + .env loaded
pnpm --filter @workspace/server start    # bun (no watch)
pnpm --filter @workspace/server db:push  # apply Drizzle schema to Neon
pnpm --filter @workspace/server db:studio

# build
pnpm build                    # all
pnpm --filter @workspace/web build
```

**Bun runtime** for `apps/server` only (everything else runs under Node). Bun is in `~/.bun/bin/bun`; if not in PATH for a fresh shell:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

---

## Git hooks (Husky)

Configured: `.husky/pre-commit` runs `pnpm exec lint-staged`, `.husky/pre-push` runs `pnpm typecheck`. Don't bypass with `--no-verify` unless explicitly requested.

`lint-staged` config in root `package.json`:

- All staged files → `prettier --write`
- `apps/**` and `packages/ui/**` ts/tsx → also `eslint --fix`

---

## Environment (apps/server/.env)

Required env vars (committed in `.env.example`, real values in `.env` ignored by git):

- `DATABASE_URL` — Neon Direct connection (the pooled one breaks `drizzle-kit push` on DDL)
- `BETTER_AUTH_SECRET` — 32+ random bytes
- `BETTER_AUTH_URL` — `http://localhost:3000` for dev
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth credentials (Google Cloud Console)
- `CORS_ORIGIN` — comma-separated, defaults to `*`
- `PORT` — defaults 3000

For deploy on Railway, see `docs/DEPLOY.md`.

---

## Pitfalls and known issues

- **drizzle-kit push fails with "column id is in a primary key"** on the current schema (likely related to the `tsvector` custom type in introspect). Workaround for new tables: write a one-off SQL migration script (see `apps/server/scripts/apply-screen-pairing.ts`). Investigate before M9 multi-pod deploy.
- **TanStack Router `routeTree.gen.ts`** is generated by the Vite plugin on `vite dev`/`vite build`. If you typecheck a fresh checkout before running either, you'll get TS2307 on `./routeTree.gen`. Run `pnpm --filter @workspace/web build` once.
- **`expo install` versions:** `expo-secure-store` may not be available at the SDK-tagged version (`pnpm install` complains `version not found`). Use `^15.0.0` for SDK 54 until Expo updates the SDK pin.
- **Vite 8 + Tailwind v4** show peer warnings (`@tailwindcss/vite` wants `^7`). Functional but noisy.
- **ESLint root must be 9.x.** Don't bump to 10: `eslint-plugin-react` v7 (transitive via `eslint-config-expo`) crashes with "contextOrFilename.getFilename is not a function".

---

## When in doubt

- Architecture decision rationale: the plan file at `~/.claude/plans/devo-iniziare-il-refactor-effervescent-lollipop.md`
- Deploy questions: `docs/DEPLOY.md`
- Old reference implementation (functional only, do not copy code): `~/projects/deployed/Karaoke`
