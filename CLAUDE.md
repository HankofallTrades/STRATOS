# AGENTS.md — Rules

These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.

## Rule 1 — Think Before Coding
State assumptions explicitly. If uncertain, ask rather than guess.
Present multiple interpretations when ambiguity exists.
Push back when a simpler approach exists.
Stop when confused. Name what's unclear.

## Rule 2 — Simplicity First
Minimum code that solves the problem. Nothing speculative.
No features beyond what was asked. No abstractions for single-use code.
Test: would a senior engineer say this is overcomplicated? If yes, simplify.

## Rule 3 — Surgical Changes
Touch only what you must. Clean up only your own mess.
Don't "improve" adjacent code, comments, or formatting.
Don't refactor what isn't broken. Match existing style.

## Rule 4 — Goal-Driven Execution
Define success criteria. Loop until verified.
Don't follow steps. Define success and iterate.
Strong success criteria let you loop independently.

## Rule 5 — Use the model only for judgment calls
Use me for: classification, drafting, summarization, extraction.
Do NOT use me for: routing, retries, deterministic transforms.
If code can answer, code answers.

## Rule 6 — Token budgets are not advisory
Per-task: 4,000 tokens. Per-session: 30,000 tokens.
If approaching budget, summarize and start fresh.
Surface the breach. Do not silently overrun.

## Rule 7 — Surface conflicts, don't average them
If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.
Don't blend conflicting patterns.

## Rule 8 — Read before you write
Before adding code, read exports, immediate callers, shared utilities.
"Looks orthogonal" is dangerous. If unsure why code is structured a way, ask.

## Rule 9 — Tests verify intent, not just behavior
Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

## Rule 10 — Checkpoint after every significant step
Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.
If you lose track, stop and restate.

## Rule 11 — Match the codebase's conventions, even if you disagree
Conformance > taste inside the codebase.
If you genuinely think a convention is harmful, surface it. Don't fork silently.

## Rule 12 — Fail loud
"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

---

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
