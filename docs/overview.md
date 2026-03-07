# Project Overview: STRATOS

This document clarifies the vision and the architecture used across the codebase so we can iterate quickly and consistently.

## Vision

STRATOS is a single-repo personal performance and life OS. It starts with fitness (workouts, analytics) and extends to daily habits, weekly goals/reflections, and an RPG-style character sheet that visualizes progress across domains.

Guiding principles:
- Keep iteration speed high by staying single-repo and single Supabase project.
- Define clean domain boundaries with a simple, explicit data contract (SQL views/RPCs).
- Keep UI thin. Derive heavy/aggregated data in SQL where possible.

## Architecture at a glance

- Runtime: React + TypeScript + Vite SPA.
- Backend/Data: Supabase (Postgres, RLS policies, SQL views/RPCs).
- State: React Query for server state; Redux Toolkit only where cross-page, cross-session global state is needed.
- UI: shadcn/ui primitives in `src/components/core`, feature/domain UI in `src/domains/*/ui`.
- Organization: domain-scoped `ui / hooks / data` layers.

### Domain‑scoped layers
We are standardizing on `ui / hooks / data` instead of `view / controller / model`.

Reason:
- The old MVC names implied stricter boundaries than the code currently enforces.
- `ui`, `hooks`, and `data` are literal names that match how this React app actually behaves today.
- This makes migration work safer because we can rename first, then tighten boundaries without pretending we already have strict MVC.

Each domain follows the same structure and responsibilities. Example for `habits`:

```
src/domains/
  habits/
    data/          # Pure TS, repositories, types, pure logic
      types.ts     # zod + TS types
      repository.ts# Supabase CRUD/RPC; the only place that does I/O
      logic.ts     # Pure derivations/business rules; no I/O
      slice.ts     # Optional Redux slice if the domain needs global state
    hooks/         # React-only orchestration
      useTriad.ts
      useCompletions.ts
    ui/            # Domain components and screens
      Triad.tsx
    index.ts       # Barrel re-export (public API for the domain)
```

Responsibilities:
- Data: Types, validation, repositories (data access), business logic (pure functions), and optional domain state helpers. No React.
- Hooks: React orchestration. Wire React Query, Redux, navigation, and domain workflows. No JSX.
- UI: Domain components and screens. The target state is props-first presentational UI, but some container UI still exists during migration. New UI code must not introduce direct Supabase access.

Migration rule:
- Rename only first.
- Move behavior only after the imports are stable.
- Do not combine directory moves with business logic rewrites in the same change unless there is no alternative.

### Data contract
- Keep tables in `public` with strict RLS.
- Expose cross-domain/aggregated data through SQL views or RPCs. Example: an RPC `get_character_sheet(user_id)` that returns XP/Level from habits, workouts, and nutrition.
- Frontend hooks call repositories and RPCs. Complex joins should not be assembled in pages or UI components.

## Source structure

- `src/`
  - `domains/` (primary organization)
    - `workout/`, `habits/`, `goals/`, `rpg/`, `notes/` (as needed)
      - `data/`, `hooks/`, `ui/`, `index.ts`
  - `components/`
    - `core/` shadcn-style primitives (buttons, dialogs, inputs, etc.)
    - `layout/` global layout components (e.g., navigation)
  - `hooks/` shared/utility hooks not tied to a single domain (e.g., `use-mobile.tsx`, `useElapsedTime.ts`)
  - `lib/`
    - `constants.ts`, `utils/*`, `prompts/*`, etc.
    - `integrations/supabase/client.ts` (shared Supabase client)
  - `pages/` route-level components that compose domain UI and call domain hooks
  - `state/` Redux store and slices used by multiple pages (only if necessary)

- `supabase/`
  - `migrations/` DDL, RLS, views, and RPCs (source of truth for the backend contract)
  - `config.toml` Supabase local/dev configuration

- `docs/`
  - `overview.md` (this doc)
  - `plan.md` (active implementation plan with checklist)

- Key configs: `package.json`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`.

## Coding conventions

- New `ui` code must not import Supabase directly. Existing violations are migration debt and should be moved behind hooks or data modules.
- `hooks` use React Query for server state; repository functions are the query/mutation fetchers.
- `data` modules are the only place that should perform I/O. Keep them thin and typed, and re-use them across hooks.
- Pages should stay thin and compose domain UI plus domain hooks. They should not become ad hoc feature containers.
- ESLint blocks direct Supabase imports from `src/pages`, `src/components/layout`, and `src/domains/*/hooks` so infrastructure access stays behind shared auth or domain data seams.
- Prefer SQL views/RPCs for non-trivial aggregations so frontends remain simple and portable.
- Export only from each domain’s `index.ts` to keep a clean public surface.
- Use clear, descriptive names; avoid abbreviations; favor pure functions and early returns.

## Adding new features (workflow)

1. Define the domain or extend an existing one.
2. Data: add/adjust tables/migrations and repository functions; add types/validation.
3. Hooks: add React hooks that wrap repository calls with React Query and orchestration.
4. UI: build components that consume hook data via props or a thin container.
5. Route: wire a page in `src/pages` if needed and compose domain UI.
6. Keep RLS and RPCs updated in `supabase/migrations` when data shapes change.

## Roadmap snapshot
See `docs/plan.md` for the active, checkable implementation plan (PR0–PR5), starting with the `habits` domain as the pilot.
