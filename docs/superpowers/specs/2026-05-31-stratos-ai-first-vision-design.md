# STRATOS AI-First Vision & Decomposition

Status: north-star vision + sub-project decomposition. This is a vision/sequencing
document, not a single implementation spec. Each sub-project below gets its own
detailed design doc + plan when we start it.

Date: 2026-05-31

## Thesis

The two tracks the product needs — a beautiful, snappy UX and a deeply integrated
AI coach — are not separate projects. They are the same product seen from two sides.
The intelligence is expressed *through* impeccable, fast, native interface, never
bolted on as a chat tab.

A beautiful UI with a shallow agent feels like a toy. A smart agent in a clumsy UI
feels like a research demo. The thing worth building, and the thing worth putting in
a portfolio, is the fusion:

> A calm, dense, gorgeous training operating system with a coach living inside every
> surface — reasoning over a model of you it keeps in your profile, and acting within
> bounds you control.

This builds on the existing STRATOS foundation: React 18 + Vite + TS, Tailwind +
shadcn, Redux Toolkit + React Query, Supabase, and a Vercel serverless Coach runtime
(`api/coach.ts`) using the Vercel AI SDK with BYOK providers. The current Coach is a
`/coach` chat screen with three tools (`generate_strength_workout`,
`get_recent_workout_summary`, `get_user_profile_summary`). The
`2026-05-26-coach-program-builder-design.md` spec is the immediate precursor to the
"acting on training" work below and its draft-and-confirm discipline is retained.

## Four Pillars

### 1. A living profile (not a "what the AI knows" screen)

The user model is folded into the **profile** itself — understated, not a showy
AI-confessional. Goals, constraints/injuries, schedule, preferences, training
philosophy, plus data-derived traits. The agent quietly maintains it; every field is
editable; provenance is available if you look (conversation vs. data-derived vs.
user-entered). The agent reasons over this, and you can correct it. This is the trust
spine the rest of the product depends on.

### 2. A proactive voice expressed through a single presence

The agent has one home on screen — a presence mark in the corner, everywhere — not
agent cards scattered permanently into every layout. Proactivity is expressed through
that mark, **tiered by importance**:

- **Quiet pulse** — the mark glows / shows a dot; nothing interrupts; you tap when ready. (Minor.)
- **Tethered peek** — the mark flashes and floats one line of preview beside itself; tap to open, swipe to dismiss. (Medium.)
- **Contextual self-expand** — for in-the-moment, high-stakes things, the mark expands into a card anchored to the relevant content, then collapses. (e.g. mid-workout, surfacing a shoulder-safe swap exactly at the overhead press.) (High / in-context.)

Autonomy is **tiered by risk** in parallel: small, low-stakes changes (swap an
exercise, nudge a load, reorder) auto-apply with a clear "I changed this — undo" note;
big moves (restructure a mesocycle, change goals) are proposed and need approval. Every
auto-change is logged and revertible.

### 3. A summonable, context-aware command surface

Tapping the presence opens a surface that knows your current screen and data. It is
**tool-equipped, not just chat**: it can read app state, render real artifacts inline
(an adapted workout, a proposed block, a multi-signal recovery readout, a chart that
results from a question), and drive the UI (navigate, filter, pin, apply changes).

Guiding principle: **the agent earns its place through synthesis and action, never
lookup.** It should not restate a number that's one tap away. It should answer the
questions you can't easily answer yourself and render the artifact that results.

- "Why has my bench stalled — what should I change?" → cross-references volume, recovery, adherence, recent deloads → proposes a concrete program edit with an Apply button.
- "I've got 35 min and my shoulder's cranky." → generates an adapted session on the spot, honoring profile constraints.
- "Am I overtraining?" → fuses volume + recovery markers + session RPE + sleep into one readout.

### 4. The craft layer

Motion, performance, restraint — the *medium* the intelligence is expressed in, not a
separate track. Snappy everywhere: optimistic UI, no spinners on known data, sub-frame
interactions. Purposeful motion. The existing dark-stone / pthalo-green design language
(`docs/design-language.md`) taken to its highest finish.

## Locked Interaction Decisions

- Agent posture: **ambient + proactive layer** (a presence, not a page).
- Proactive triggers: **when the app is active** (app open, workout finished, opening your program). No background jobs / scheduled server runs / push in this vision.
- User model: **living profile**, understated, editable, provenance available, agent-maintained.
- Autonomy: **tiered by risk** — auto-apply small changes with undo, ask before big ones; everything logged and revertible.
- Proactive surfacing: **single presence mark**, assertiveness **tiered by importance** (quiet pulse → tethered peek → contextual self-expand).
- Summon: **context-aware, tool-equipped command surface** that renders artifacts inline and drives the UI; earns its place through synthesis + action.
- Build strategy: **full vision now, decompose into sequenced sub-projects**, built **foundations-first (breadth)**.

## Decomposition: Five Sub-Projects

Dependency chain: 1 → 2 → 3 → 4; craft (5) woven throughout plus a final dedicated pass.
Each sub-project is separately shippable and demoable.

### Sub-project 1 — Living profile (substrate)

- **Scope:** A schema for the user model (goals, constraints/injuries, schedule, preferences, training philosophy, data-derived traits). An understated, editable profile UI surfacing it. Provenance per field (user-entered / conversation-derived / data-derived). Agent read/write access to it.
- **Builds on:** `account` domain (profile/onboarding), existing onboarding fields, `analytics` for data-derived traits.
- **Why first:** Everything else reasons over this. It is the smallest, lowest-risk piece with the highest downstream leverage.
- **Ships:** A beautiful, editable profile the agent maintains and can cite.
- **Open questions (for its own spec):** exact schema + storage (new table vs. extend profile); how data-derived traits are computed and refreshed; provenance UI treatment; how the agent proposes profile edits (auto vs. confirm).

### Sub-project 2 — Presence shell + context-aware summon (headline demo)

- **Scope:** The single presence mark across all screens; the summon surface; current-screen + app-state context passed to the agent; an expanded tool framework; inline artifact rendering; the first read/synthesis/generative tools (read training data, render chart, generate/adapt a workout, navigate/drive UI).
- **Builds on:** existing `guidance/agent/*` runtime, contracts, transport, and tools; existing `/coach` chat; `analytics` and `fitness` repositories for data; the design language for the surface.
- **Why second:** It is the chassis the acting + proactive layers plug into, and it is the headline demo on its own.
- **Ships:** Summon anywhere → synthesis + inline-artifact answers; the agent can read your data and render real results in context.
- **Open questions:** what "current context" payload the agent receives; how inline artifacts are declared/rendered (a typed artifact contract vs. ad hoc); migration path from the `/coach` page to a global presence; tool framework shape for client- vs. server-executed tools.

### Sub-project 3 — Acting on your training (the "act" layer)

- **Scope:** Tools that safely mutate workouts / programs / mesocycles; a change log; one-tap revert. Extends the draft-and-confirm program builder (`2026-05-26-coach-program-builder-design.md`) toward editing existing structures, with tiered autonomy for small auto-applied edits.
- **Builds on:** `periodization` (source of truth for mesocycles/session templates), `fitness` (workout execution + catalog), the program-builder spec, the tool framework from sub-project 2.
- **Why third:** Needs the presence/tool chassis (2) and the profile (1) to act sensibly; provides the actions the proactive engine (4) will trigger.
- **Ships:** The agent can actually change your program/workout safely, with a visible, revertible change log.
- **Open questions:** which mutations are auto-tier vs. confirm-tier; change-log storage + revert mechanics; conflict handling with in-progress workouts (Redux `workout` slice); guardrails reusing the program-builder's catalog-resolution rules.

### Sub-project 4 — Proactive engine + tiered surfacing

- **Scope:** Wake-on-active triggers (app open, workout finished, opening your program); insight/intervention generation reasoning over the profile (1) and data; the tiered pulse / peek / self-expand surfacing UX (2); tiered-autonomy application of acting tools (3); the undo/audit surface.
- **Builds on:** all of 1–3; `dashboard` (home is a primary surfacing point); offline/session lifecycle hooks for "workout finished".
- **Why fourth:** It is the capstone that makes the layer feel alive, and it depends on everything before it.
- **Ships:** The proactive layer comes alive — STRATOS notices things and acts within bounds at natural moments.
- **Open questions:** where reasoning runs (request-time on app-active events; cost/latency budget per AGENTS.md token rules); dedupe/cooldown so the agent isn't noisy; how proposals queue and persist between sessions; surfacing-tier classification rules.

### Sub-project 5 — Craft & performance pass

- **Scope:** A motion system; a performance budget (optimistic UI, no spinners on known data, lazy/route-level care building on the existing chunking work); screen-by-screen finish on flagship surfaces (Home, Workout, Analytics, the summon surface, the profile).
- **Builds on:** `docs/design-language.md`; existing lazy-loading/bundle work noted in CODEMAP; all preceding surfaces.
- **Why last (as a dedicated pass):** craft is applied while building each piece, but a final dedicated pass elevates the flagship surfaces to portfolio finish without polishing screens that later get restructured for the agent.
- **Ships:** The whole thing feels effortless and looks authored.
- **Open questions:** motion library/approach (framer-motion is already a dependency); perf budget targets + how they're measured; which surfaces are "flagship" for the portfolio cut.

## Out of Scope (this vision)

- Background/scheduled server agent runs, nightly program adjustments, and push notifications (explicitly deferred; the agent wakes only when the app is active).
- A separate "what the AI knows about you" marketing screen (folded into the profile instead).
- Hosted (non-BYOK) provider defaults; BYOK + local provider remain the model unless a portfolio demo later needs a hosted key.
- The `goals` and `rpg` placeholder domains.

## Sequence

1. Living profile (substrate)
2. Presence shell + context-aware summon (headline demo)
3. Acting on your training (safe edits + undo)
4. Proactive engine + tiered surfacing (the layer comes alive)
5. Craft & performance pass (final finish)

## Next Step

Brainstorm sub-project 1 (Living profile) through the normal design flow into its own
detailed spec, then a plan.

## Refinements from sub-project 1 design (2026-05-31)

These decisions, made while detailing sub-project 1
(`2026-05-31-living-profile-design.md`), supersede earlier text above where they
conflict:

- **Provenance is not surfaced in the UI.** It adds no user value. Where a fact came
  from is kept only as an internal `source` flag for agent-write safety. (Supersedes
  Pillar 1's "provenance is available if you look" and the "provenance available" item
  under Locked Interaction Decisions.)
- **Derived/computed traits are not part of the profile.** They live in Analytics. The
  profile holds only user/agent-authored facts. (Supersedes "plus data-derived traits"
  in Pillar 1; sub-project 1's derived-facts question is resolved as: surface in
  Analytics, not Profile.)
- **Sub-project 1 is read-now, write-later.** It ships the `user_facts` table, the
  editable Profile screen, the Settings-under-Profile relocation, and an agent *read*
  tool. Agent *writes* (auto-capture, keep/remove, confirm-for-constraints) move to
  sub-project 2, built on the presence surface.
- **Profile replaces Settings** as the nav destination; existing Settings nests under
  `/profile/settings`.
- **Equipment is a free-text fact** in v1 (not wired to `equipment_types`); **training
  background** is two structured `profiles` fields, not facts.
