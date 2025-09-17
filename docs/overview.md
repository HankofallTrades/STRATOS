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
- UI: shadcn/ui primitives in `src/components/core`, feature/domain views in `src/domains/*/view`.
- Organization: Domain‑scoped MVC for clarity and testability.

### Domain‑scoped MVC
Each domain follows the same structure and responsibilities. Example for `habits`:

```
src/domains/
  habits/
    model/         # Pure TS (no React)
      types.ts     # zod + TS types
      repository.ts# Supabase CRUD/RPC; the only place that does I/O
      logic.ts     # Pure derivations/business rules; no I/O
      slice.ts     # Optional Redux slice if the domain needs global state
    controller/    # React-only orchestration (hooks)
      useTriad.ts
      useCompletions.ts
    view/          # Presentational JSX only; no data access
      Triad.tsx
    index.ts       # Barrel re-export (public API for the domain)
```

Responsibilities:
- Model: Types, validation, repositories (data access), business logic (pure functions). No React.
- Controller: Hooks that orchestrate repositories/logic, wire React Query, handle optimistic updates. No JSX.
- View: Presentational components. Receive data/handlers via props only. No Supabase/Redux imports.

### Data contract
- Keep tables in `public` with strict RLS.
- Expose cross-domain/aggregated data through SQL views or RPCs. Example: an RPC `get_character_sheet(user_id)` that returns XP/Level from habits, workouts, and nutrition.
- Frontend controllers call `supabase.rpc(...)` and never assemble complex cross-domain joins in components.

## Source structure

- `src/`
  - `domains/` (primary organization)
    - `workout/`, `habits/`, `goals/`, `rpg/`, `notes/` (as needed)
      - `model/`, `controller/`, `view/`, `index.ts`
  - `components/`
    - `core/` shadcn-style primitives (buttons, dialogs, inputs, etc.)
    - `layout/` global layout components (e.g., navigation)
  - `hooks/` shared/utility hooks not tied to a single domain (e.g., `use-mobile.tsx`, `useElapsedTime.ts`)
  - `lib/`
    - `constants.ts`, `utils/*`, `prompts/*`, etc.
    - `integrations/supabase/client.ts` (shared Supabase client)
  - `pages/` route-level components that compose domain views
  - `state/` Redux store and slices used by multiple pages (only if necessary)

- `supabase/`
  - `migrations/` DDL, RLS, views, and RPCs (source of truth for the backend contract)
  - `config.toml` Supabase local/dev configuration

- `docs/`
  - `overview.md` (this doc)
  - `plan.md` (active implementation plan with checklist)

- Key configs: `package.json`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`.

## Coding conventions

- Views never import Supabase or Redux directly; they consume props from controllers.
- Controllers use React Query for server state; repository functions are the query/mutation fetchers.
- Repositories are the only place that perform I/O. Keep them thin and typed, and re-use them across controllers.
- Prefer SQL views/RPCs for non-trivial aggregations so frontends remain simple and portable.
- Export only from each domain’s `index.ts` to keep a clean public surface.
- Use clear, descriptive names; avoid abbreviations; favor pure functions and early returns.

## Adding new features (workflow)

1. Define the domain or extend an existing one.
2. Model: add/adjust tables/migrations and repository functions; add types/validation.
3. Controller: add hooks that wrap repository calls with React Query and orchestration.
4. View: build presentational components that consume the controller hooks via props.
5. Route: wire a page in `src/pages` if needed and compose domain views.
6. Keep RLS and RPCs updated in `supabase/migrations` when data shapes change.

## Roadmap snapshot
See `docs/plan.md` for the active, checkable implementation plan (PR0–PR5), starting with the `habits` domain as the pilot.
