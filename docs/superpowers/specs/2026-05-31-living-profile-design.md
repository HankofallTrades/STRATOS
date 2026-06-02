# Living Profile Design (Sub-project 1)

Status: detailed design for sub-project 1 of the STRATOS AI-first vision
(`2026-05-31-stratos-ai-first-vision-design.md`). Foundations-first: this is the
substrate the later sub-projects reason over.

Date: 2026-05-31

## Goal

Give STRATOS a structured, editable "model of you" — goals, constraints/injuries,
schedule, preferences, equipment, plus training background and body metrics — that the
user can see and edit, and that the agent can read. This replaces the thin
body-metrics-only profile and makes the Profile the home for both the model and the
existing Settings.

This sub-project is **read-now, write-later**: the agent can read the model; the agent
*writing* to it (auto-capture from conversation, keep/remove, confirm-for-constraints)
is deferred to sub-project 2, where it is built once on the new presence surface
instead of against the soon-to-be-replaced `/coach` chat.

## Decisions

- The "model of you" is stored as rows in a new `user_facts` table, one row per item,
  not as a JSONB blob or typed columns. Rationale: per-item edit/add/remove and a
  uniform agent-readable shape.
- Categories in v1: `goal`, `constraint`, `schedule`, `preference`, `equipment`.
- Provenance is **not surfaced in the UI**. It adds no user value. A `source` field is
  kept internally only (`user` | `agent`) so future agent writes (sub-project 2) know
  not to silently overwrite a user-entered fact.
- Derived/computed insights (progression, frequency, adherence) are **not** part of the
  profile. They live in Analytics. The profile holds only user/agent-authored facts.
- Equipment is a free-text fact in v1. It is **not** wired to the `equipment_types`
  catalog (that table models equipment for exercise logging, a different concept).
- Training background is **two structured fields on `profiles`** (experience level,
  training-age years), not `user_facts` rows. It renders as the Profile subtitle.
- Body metrics (`age`, `height`, `weight`) and unit prefs stay as `profiles` columns,
  shown in a Body section and edited as today.
- Profile **replaces** Settings as a nav destination. Existing SettingsScreen content
  moves under Profile at a nested route, unchanged in function.
- The agent reads the model through the server tool layer (extends the existing
  `get_user_profile_summary` server tool to include active facts + background).

## Assumptions

- `profiles` already exists with `age`, `height`, `weight`, `focus`, unit prefs,
  `username`, `avatar_url`. We extend it with two background fields; we do not
  restructure it.
- The current `/coach` chat is the only conversational surface in this sub-project's
  world. It gains the ability to reason over the real model via the read tool; it does
  not write facts.
- RLS: a user can only read/write their own `user_facts`. The server agent read path
  is scoped to the authenticated user, consistent with existing server tools.
- No data migration of existing free-text profile content is required (there is none to
  migrate beyond body metrics, which stay put).

## Success Criteria

- A `user_facts` table exists with RLS; a user sees only their own facts.
- A new `/profile` screen lists the user's facts grouped by category, with inline edit,
  `+ add`, and remove, plus a Body section and an `Analytics →` link.
- The nav item is Profile (not Settings); the previous Settings screen is reachable
  from Profile at `/profile/settings` and works exactly as before (units, Coach
  provider/key, training-period reset, account/sign-out).
- No provenance is shown anywhere in the profile UI.
- The existing Coach can read the user's model: asking it about the user's goals or
  constraints reflects the actual `user_facts` + background, via the read tool.
- `npm run build` and `npm run lint` pass (lint baseline unchanged: 8 warnings).
- CODEMAP route map + state ownership updated for the new route and `account` surface.

## Data Model

New table `public.user_facts`:

- `id` uuid pk default gen_random_uuid()
- `user_id` uuid not null references `profiles(id)` on delete cascade
- `category` text not null check in (`goal`,`constraint`,`schedule`,`preference`,`equipment`)
- `content` text not null
- `detail` jsonb null  — optional structured payload (e.g. goal `{ target, unit, by }`, schedule `{ days, session_minutes }`)
- `source` text not null default `user` check in (`user`,`agent`)  — internal only, never shown
- `status` text not null default `active` check in (`active`,`pending`,`dismissed`)  — `pending` reserved for sub-project 2 agent proposals
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

RLS: select/insert/update/delete limited to `auth.uid() = user_id`. `updated_at`
maintained by a trigger or in the repository update path, matching existing conventions.

`profiles` additions:

- `experience_level` text null  — e.g. `beginner` | `intermediate` | `advanced`
- `training_age_years` numeric null

## Architecture

Owned by the `account` domain (it owns profile + onboarding + settings today).

- `data/`
  - Extend `accountRepository.ts` or add `userFactsRepository.ts` for `user_facts`
    CRUD (the I/O boundary; the only place importing Supabase).
  - Types for `UserFact`, `UserFactCategory`, `UserFactInput`.
- `hooks/`
  - `useProfileModel.ts` (or fold into a profile-screen hook): React Query for facts +
    profile; create/update/delete mutations with scoped invalidation.
  - `useSettingsScreen.ts` stays; it moves with the nested settings route.
- `ui/`
  - `ProfileScreen.tsx` — the living-profile screen (facts by category, Body, footer
    link). Presentational where practical, per the props-first guardrail.
  - Fact row + add/edit affordances (inline or a small dialog, matching existing
    dialog patterns).
  - `SettingsScreen.tsx` — unchanged content, rendered under the nested route.

Routing / shell:

- Add `/profile` (page → `ProfileScreen`) and nest the existing settings under
  `/profile/settings` (page → `SettingsScreen`).
- `navigationItems.ts`: replace the Settings item with a Profile item (avatar/person
  icon). Keep route-active logic working for the nested settings path.
- Pages stay thin wrappers around domain screens; no Supabase imports outside `data/`.

Agent read path:

- Extend `get_user_profile_summary` (server tool in `guidance/agent/runtime.ts`) to
  include the user's active `user_facts` (grouped by category) + background fields, so
  the existing Coach reasons over the real model. No new tool framework; no write tool
  in this sub-project.

## Out of Scope (this sub-project)

- Agent **writes**: auto-capture from conversation, the `New · Keep/Remove` review, and
  confirm-for-constraints. All deferred to sub-project 2 (built on the presence surface).
- Derived/computed traits in the profile (they live in Analytics).
- Coaching-style and recovery/lifestyle categories (deferred).
- Equipment integration with `equipment_types`.
- Any change to the proactive layer, presence mark, or summon surface.

## Verification

Run sequentially (per repo rules; never in parallel):

1. `npm run build`
2. `npm run lint`  (expect the existing 8-warning baseline, 0 errors)

There is no test script; do not claim test coverage unless one is added. Manually
verify: facts CRUD + RLS isolation, the nav swap, the nested settings route still
performing all prior actions, and that Coach reflects the real model.

## Next Step

After approval: invoke the writing-plans skill to turn this into an implementation plan.
