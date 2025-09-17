# StratOS — Product Requirements Document (PRD)

## Problem
People juggle fitness, habits, goals, and daily execution across many apps. There’s no unified, low-friction place to plan, act, and reflect. Data rarely turns into decisions.

## Vision
A personal operating system for life. A single daily workspace that unifies body, systems, and guidance:
- Body: fitness, nutrition, sun exposure
- Systems: habits, goals, routines
- Guidance: context-aware coaching

## Target User
- Optimizers and builders who want a tight feedback loop
- Mobile-first usage with quick capture and glanceable dashboards

## Goals (MVP)
- Provide a unified, fast mobile UI that surfaces today’s priorities and lets users log with minimal taps
- Support habits and goals alongside the existing fitness/wellness foundation
- Enable a daily planning/reflect cycle with a single actionable dashboard

## Non-Goals (MVP)
- RPG-style character sheet and skill scores
- Full program design/periodization suite
- Complex social features

## Scope (MVP)
1. Daily Dashboard (Today)
   - Glanceable modules: protein progress, sun exposure, weekly zone 2, and top 3 habits for today
   - Quick actions: start workout, log protein, log sun exposure, complete habit
2. Habits
   - Create simple binary habits (done/not done) with frequency (daily/weekly)
   - Today view shows actionable habits; completion logs to Supabase
3. Goals
   - Create and track up to 3 active goals with simple progress notes
   - Lightweight weekly reflection field per goal
4. Review
   - Weekly check-in prompt pulling highlights (e.g., cardio minutes, protein consistency, habit completion)

## Success Metrics
- Median daily sessions per user
- % of users completing at least 1 habit/day (7-day rolling)
- Time-to-log (ms) for protein/sun/habit
- Crash-free sessions and p95 UI latency

## User Stories (Selected)
- As a user, I see my top habits at the top of Today and can mark them done with one tap.
- As a user, I can log protein and sun within two taps from Today.
- As a user, I can start a workout from Today and return back to it easily.
- As a user, I can set up to 3 goals and add a brief weekly reflection.
- As a user, I can see my weekly cardio minutes against a target on Today.

## Acceptance Criteria
- Today screen loads in < 500ms on modern mobile hardware (warm cache)
- 2-tap logging flow for protein and sun exposure
- Habit completion persists and survives reloads
- Goals and weekly reflections persist and can be edited
- No TypeScript errors; CI build green

## Architecture Notes
- Keep the existing React + Redux + Supabase stack
- Add new Supabase tables:
  - `habits` (id, user_id, title, frequency, is_active, created_at)
  - `habit_completions` (id, habit_id, user_id, date)
  - `goals` (id, user_id, title, is_active, created_at)
  - `goal_reflections` (id, goal_id, user_id, week_start_date, note)
- Create thin data accessors in `src/lib/integrations/supabase/`
- Add feature components under `src/components/features/OS/`
- Maintain mobile-first layouts; ensure components are composable

## Milestones
1. Foundation (Week 1)
   - New tables and migrations
   - Data access functions and basic Redux slices
2. Habits + Goals (Week 2)
   - Create/edit habits and goals
   - Today shows top habits
3. Today Dashboard (Week 3)
   - Integrate protein, sun, cardio widgets with habits/goals
   - Quick actions and navigation polish
4. Review (Week 4)
   - Weekly reflection entry and highlights
   - Stabilization, performance passes

## Risks & Mitigations
- Scope creep: Keep RPG ideas and program design as non-goals; revisit post-MVP
- Latency on mobile: prioritize minimal queries, memoization, and suspense-friendly data layers
- Data integrity: server constraints; avoid client-side only state for core logs

## Open Questions
- Do we need per-habit reminders at MVP, or can we defer?
- Should goals support numeric tracking, or remain freeform with reflections?

## Post-MVP Ideas (Deferred)
- Character sheet and skill scores derived from behaviors
- Program design and coaching plans
- Reminders and notifications
- Simple social sharing of weekly highlights
