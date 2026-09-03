# AGENTS.md

STRATOS is a personal training and recovery OS: a React SPA (Vite, TypeScript,
Tailwind, shadcn/Radix) on Supabase, shipping to web via Vercel and to iOS as a
Capacitor wrap of the same codebase. It has one user.

Package manager is **npm** (`package-lock.json` is the real lockfile; the stray
`bun.lockb` is not maintained).

## Commands

| | |
|---|---|
| `npm run dev` | dev server; comes up already signed in (see below) |
| `npm run build` | web build, PWA included |
| `npm run build:ios` | wrap build; the *only* difference is that PWA is dropped |
| `npm run lint` | expected baseline: **8 warnings, 0 errors** |
| `npm test` | Vitest, node environment, no React or live Supabase |

**Do not run `build` and `lint` at the same time.** Vite writes transient
`vite.config.ts.timestamp-*.mjs` files that make ESLint fail with `ENOENT`. Run
them sequentially. `npm test` is safe to run alongside either.

The 8 lint warnings are all `react-refresh/only-export-components` in vendored
shadcn components and in providers that export their hook. Left as-is on purpose;
a 9th warning means you added one.

`npm run dev` auto-signs-in from `.env.development.local` in dev builds only
(template: `.env.development.example`). Use the e2e test account, never a real user.

## Rules

- **Surgical changes.** Touch only what the task needs. Don't improve adjacent
  code, comments, or formatting. Don't refactor what isn't broken. Match the
  style around you.
- **Fail loud.** "Done" is wrong if anything was skipped. "Tests pass" is wrong
  if any were skipped. Surface uncertainty rather than papering over it.
- **Surface conflicts, don't average them.** If two patterns contradict, pick one
  (more recent, or better tested), say why, and flag the other for cleanup.
- **Tests encode why, not just what.** A test that can't fail when the business
  rule changes is not testing the business rule.
- **In product code, use the model only for judgment.** Classification, drafting,
  summarization, extraction — yes. Routing, retries, deterministic transforms —
  no. If code can answer, code answers.

## Architecture

Layers are `ui / hooks / data`. `src/domains/*/data` is the I/O boundary and the
only place that touches Supabase — ESLint enforces this for `src/pages`,
`src/components/layout`, and `src/domains/*/hooks`. Keep route files thin and
compose page → domain screen. Prefer extending an existing domain seam over
adding app-level one-off logic.

## Database

For anything that depends on actual remote state, inspect the linked Supabase
project rather than inferring it from migrations or local code — especially for
exercise catalog cleanup, variation/equipment normalization, foreign-key cleanup,
RLS-sensitive checks, and mesocycle/session-template repairs. Prefer the Supabase
CLI; fall back to direct inspection with the linked project credentials if the
CLI is blocked.

Migrations applied through the Supabase MCP get an MCP-assigned timestamp
version, not the local filename's version. After applying via MCP, rename the
local file to the version recorded in `schema_migrations`. That drift is what
previously broke `db push`.

## Where things are documented

- `CONTEXT.md` — domain glossary. The canonical vocabulary; use these terms exactly.
- `docs/adr/` — decisions that were hard to reverse or involved a real trade-off.
- `docs/ios.md` — building, running, and smoke-testing the iOS wrap.
- `docs/design-language.md` — visual and motion conventions.
- `docs/agents/` — issue tracker (Linear), triage labels, and how to use domain docs.

Issues live in **Linear** (workspace `daimodus`, team `StratOS`, project
`Stratos`), not GitHub Issues.
