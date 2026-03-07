# Repository Instructions

Read `/Users/hank/projects/stratos/CODEMAP.md` before doing substantial work in this repo.

## Session Startup

1. Read `/Users/hank/projects/stratos/CODEMAP.md`.
2. Read `/Users/hank/projects/stratos/docs/overview.md` if the task touches architecture or boundaries.
3. Read `/Users/hank/projects/stratos/docs/plan.md` if the task is part of the ongoing refactor or a new domain rollout.
4. Run `git status --short` before editing because this repo may be intentionally dirty during refactors.

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

Update `/Users/hank/projects/stratos/CODEMAP.md` in the same change whenever you alter:

- route ownership
- domain entrypoints
- state ownership
- architecture guardrails
- Coach agent/runtime boundaries
- expected verification baseline

If a future session would make a wrong assumption without updated context, update the codemap.
