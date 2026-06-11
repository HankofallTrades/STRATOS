# Proactive Engine + Tiered Surfacing Design (Sub-project 4)

Status: detailed design for sub-project 4 of the STRATOS AI-first vision
(`2026-05-31-stratos-ai-first-vision-design.md`). Builds on sub-project 2
(presence/summon, shipped) and sub-project 3 (acting tools + change log, shipped).

Date: 2026-06-11

## Goal

Make STRATOS notice things at natural moments — app open, workout finished — and
surface them through the presence mark with importance-tiered assertiveness:
**quiet pulse** (orb glows) for minor things, **tethered peek** (one line beside the
orb) for things worth a glance. Engaging an insight drops the user into a seeded
Coach conversation that can use every existing read/act tool.

## Decisions

- **Propose-only.** The proactive layer never mutates anything unattended. It
  surfaces insights; acting goes through sub-project 3's artifacts and explicit
  Apply. No auto-apply tier in this sub-project.
- **Deterministic gates; zero proactive LLM spend.** Code-level checks (AGENTS
  Rule 5) decide *whether* there is something worth saying and compose the short
  peek/pulse line from templates. The LLM is invoked only when the user engages —
  the tap opens the summon surface and sends a seeded prompt, a normal Coach turn
  with full tool access. This refines the approved "deterministic gate" choice one
  step further: since peek lines are one templatable sentence, code composes them
  too, and the model's synthesis happens where it has tools and room — in the
  surface. Result: a BYOK user pays nothing for proactivity they ignore.
- **Ephemeral insights + localStorage cooldowns.** Active insights live in
  provider state and are re-derived on each trigger. Dedupe/cooldown state (per
  insight id, per user) persists in localStorage so dismissals and engagements
  suppress repeats across reloads. No new tables.
- **Two tiers: pulse + peek.** `pulse` lights the existing orb attention state;
  `peek` additionally floats a one-line preview beside the orb (tap to engage,
  dismiss control to wave it off). Contextual self-expand (anchored in-context
  cards) is deferred.
- **Triggers: app open and workout finished.** Both fire within the protected
  shell. "App open" runs once when the engine mounts with an authenticated user
  (and re-checks on navigation to home, where cooldowns make repeats no-ops).
  "Workout finished" fires on the Redux `isWorkoutActive` true→false transition.
  No background jobs, no push (per the vision).
- **The engine lives in `guidance`.** Pure gate logic in `data/`, the orchestration
  hook mounted from `PresenceAgentProvider`, peek UI next to the presence mark.

## Insight model

```ts
export type ProactiveTier = "pulse" | "peek";

export interface ProactiveInsight {
  id: string;            // stable gate id, e.g. "program_ending" — cooldown key
  tier: ProactiveTier;
  line: string;          // template-composed one-liner shown in the peek / a11y label
  seedPrompt: string;    // user-voice prompt sent to the Coach on engagement
  cooldownHours: number; // suppression window after dismiss/engage
  dedupeKey?: string;    // optional sub-key (e.g. workout id) for per-event dedupe
}
```

## Gates (v1)

Pure functions over a snapshot `{ activeProgram, workoutHistory, volumeProgress, now }`
(all already available client-side: React Query's active-program query, the Redux
history slice, and the weekly archetype volume data):

| id | Tier | Fires when | Line (template) | Seed prompt | Cooldown |
|----|------|-----------|------------------|-------------|----------|
| `no_active_program` | pulse | no active program | — (pulse only) | "Help me set up a training program." | 7 days |
| `program_ending` | peek | `current_week >= duration_weeks` on an active program | "Your training block ends this week — want me to plan the next one?" | "My current program is ending. Review how it went and propose the next block." | 72 h |
| `missed_training` | peek | last completed workout ≥ 4 days ago (and history is non-empty) | "It's been N days since your last session — want a plan for today?" | "It's been a few days since I trained. Propose a session for today." | 48 h |
| `volume_gap_late_week` | peek | day ≥ Friday and some archetype < 50% of weekly goal | "X volume is behind this week (a/b sets)." | "Where is my training volume behind this week, and what should I do about it?" | until next week (computed hours) |
| `workout_finished` | peek | workout-finished trigger | "Session logged. Want a quick read on it?" | "I just finished a workout. Give me a quick read and anything to adjust." | per-workout (`dedupeKey` = workout id) |

Gate thresholds are constants in the gate module. Gates must be cheap: they read
already-cached query data and Redux state; the app-open trigger may `ensureQueryData`
the active program and weekly volume (both already standard queries with stale
times), nothing else.

## Cooldown store

`data/proactiveCooldowns.ts` — localStorage map under
`stratos.coach.proactive.<userId>`:

```ts
{ [insightId or `${insightId}:${dedupeKey}`]: { suppressedUntil: string } }
```

- Engaging or dismissing an insight writes `suppressedUntil = now + cooldownHours`.
- Gates whose key is suppressed are skipped at derivation time.
- Corrupt/missing storage degrades to "no suppression" (worst case: a repeat nudge).

## Orchestration

`hooks/useProactiveEngine.ts`, invoked from `PresenceAgentProvider`:

- Holds `insights: ProactiveInsight[]` (deduped, peek-tier first, max 1 peek shown).
- `runGates(trigger)`: assemble the snapshot, evaluate gates, filter by cooldown,
  set state.
- Triggers:
  - on mount with authenticated user → `runGates("app_open")`
  - `isWorkoutActive` true→false edge → `runGates("workout_finished")` (the
    finished workout's id is captured before the flag flips for the dedupe key)
  - navigation to `/` → `runGates("app_open")` (cooldowns make this cheap/quiet)
- `engageInsight(insight)`: write cooldown, clear it from state, `summon()` the
  surface, and `send(insight.seedPrompt)` as a normal user turn.
- `dismissInsight(insight)`: write cooldown, clear from state.
- Provider exposes `proactiveInsights`, `engageInsight`, `dismissInsight`; the
  orb's existing `hasAttention` becomes `hasAttention || insights.length > 0`
  (pulse tier is exactly this glow; peek tier additionally renders the preview).
- Insights are cleared when the surface opens for the engaged insight; pulse-only
  insights clear on any surface open (the user looked).

## Peek UI

`PresencePeek` (`domains/guidance/ui`), mounted next to `PresenceMark` in
`MainAppLayout`:

- Renders the top peek-tier insight as a single-line floating chip anchored above
  the orb (fixed positioning consistent with the orb; safe-area aware on mobile).
- Tap → `engageInsight`. A small dismiss (×) → `dismissInsight`.
- Enters with a gentle rise/fade (existing design language; no new motion deps),
  auto-hides after ~12 s into pulse state (the orb keeps glowing; the insight
  remains available next trigger until engaged/dismissed/cooled down).
- Hidden while the summon surface is open and while a Coach turn is loading.

## Error handling

- Gate snapshot fetch failures (e.g. program query errors) skip that gate silently
  — proactivity must never surface an error state.
- localStorage unavailable → cooldowns degrade to session-memory only.
- Engagement while the provider is mid-turn queues nothing: the peek is hidden
  during loading; tapping is a no-op until idle.
- The engine never runs unauthenticated and never blocks initial render (runs in
  effects after mount).

## Out of scope

- Auto-applied changes of any kind; tier-by-risk autonomy.
- Contextual self-expand anchored cards.
- Server-side insight generation, background jobs, push notifications.
- A persisted insight inbox/history (`coach_insights` table).
- New gate data sources (sleep, RPE, recovery markers).

## Verification

No test runner; sequential `npm run build` then `npm run lint` (baseline: 8 unique
warnings double-reported as 16, 0 errors). Gate logic and the cooldown store are
pure modules kept separately so they can be exercised by a future test harness.

Manual checks: fresh user with no program sees the orb pulse and a program seed on
engagement; a user whose block is in its final week sees the peek line, tap opens
the surface and sends the seed prompt; dismissing suppresses it across reload;
finishing a workout raises the post-session peek once per workout; no LLM/network
calls occur from triggers alone (network tab), only on engagement.

## CODEMAP maintenance

Update in the same change: guidance entrypoints (`useProactiveEngine`,
`proactiveGates`, `proactiveCooldowns`, `PresencePeek`), the presence/orb state
ownership note (attention = conversation attention ∪ proactive insights), and the
Coach architecture summary (proactive layer: deterministic gates, zero-token until
engagement, propose-only).

## Success criteria

- Opening the app with a notable condition lights the orb (pulse) or floats one
  line (peek) within a moment of load, with no LLM call and no jank.
- Tapping a peek opens the summon surface and immediately runs a seeded Coach turn
  that can read data and propose artifacts (including sub-project 3 actions).
- Dismissed insights stay quiet for their cooldown, across reloads.
- Finishing a workout surfaces the post-session peek exactly once per workout.
- A user who ignores the proactive layer entirely spends zero provider tokens on it.
- Build and lint pass at the expected baseline.
