# Repository Instructions

Read `./CODEMAP.md` before doing substantial work in this repo.

## Session Startup

1. Read `./CODEMAP.md`.
2. Read `./docs/overview.md` if the task touches architecture or boundaries.
3. Read `./docs/plan.md` if it exists and the task is part of an ongoing refactor or a new domain rollout.
4. Run `git status --short` before editing because this repo may be intentionally dirty during refactors.

## Working Tree Hygiene

- After `git status --short`, run `git diff --stat` when the tree is dirty so you can classify the changes before editing.
- Do not assume all dirty paths are part of the task. This repo often mixes real WIP with generated local artifacts.
- Treat `.vite/` as generated Vite cache output unless the task is explicitly about build tooling.
- Treat `supabase/.temp/*` as linked-project CLI state unless the task is explicitly about Supabase CLI setup or repo hygiene.
- If the working tree includes changes across `vite.config.ts`, `package.json`, `package-lock.json`, `index.html`, `src/state/store.ts`, `src/domains/fitness/hooks/useWorkout.ts`, `src/components/layout/MainAppLayout.tsx`, `src/hooks/useOfflineSync.ts`, `src/lib/offlineQueue.ts`, and `public/icon-*.svg`, assume you are looking at one unfinished offline/PWA feature thread until proven otherwise.
- Never revert or overwrite dirty files just to get a clean starting point. Understand whether they are user work, generated noise, or task-relevant first.

## Database Workflow

- For anything that depends on actual remote database state, inspect the linked Supabase project before making assumptions.
- Prefer the Supabase CLI first for linked-project inspection and management.
- If the CLI path is blocked by environment limits but the task still requires remote verification, use the linked project credentials to inspect the database directly rather than guessing from migrations or local code.
- This especially applies to exercise catalog cleanup, variation/equipment normalization, foreign-key cleanup, RLS-sensitive data checks, and mesocycle/session template data.

## Architecture Rules

- Use `ui / hooks / data`. Do not introduce `view / controller / model`.
- Treat `src/domains/*/data` as the I/O boundary.
- Pages, layout components, and domain hooks must not import Supabase directly.
- Keep route files thin. Prefer page -> domain screen composition.
- Prefer extending an existing domain seam over adding new app-level one-off logic.

## Verification

- Run verification commands sequentially, not in parallel:
  1. `npm run build`
  2. `npm run lint`
- Do not run build and lint at the same time in this repo. Vite can create temporary timestamped config files that make ESLint fail with `ENOENT`.
- There is currently no test script, so do not claim test coverage unless you added and ran one explicitly.

## Codemap Maintenance

Update `./CODEMAP.md` in the same change whenever you alter:

- route ownership
- domain entrypoints
- state ownership
- architecture guardrails
- Coach agent/runtime boundaries
- expected verification baseline

If a future session would make a wrong assumption without updated context, update the codemap.
