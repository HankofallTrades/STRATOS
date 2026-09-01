# Handoff: iOS migration planning

Written 2026-09-01 for a fresh session on **Fable** (`claude-fable-5`). Everything
below was verified against the repo on that date.

## Your job, and where it stops

Plan the **iOS migration of STRATOS**. Produce a spec and tickets. **Do not implement.**

Fable is reserved for spec and planning here because it is expensive. The flow already
splits at exactly the right place:

1. `/grill-with-docs` to sharpen the idea (stateful: it writes `CONTEXT.md` and ADRs)
2. `/to-spec` to turn the thread into a spec
3. `/to-tickets` to split the spec into tracer-bullet tickets with blocking edges

Then **stop and hand back**. Each ticket gets its own fresh session on a cheaper model
running `/implement`. Steps 1 to 3 belong in **one unbroken context window**: do not
`/compact` or `/clear` before `/to-tickets`, because the spec and tickets need to build
on the grilling. If you approach the smart zone before then, compact at a phase
boundary rather than pushing on degraded.

## Which skill to open with

**Open with `/grill-with-docs`.** Use its first round to establish one thing: **is the
platform path already decided?**

- **If yes** (Hank names Capacitor, React Native, native Swift, or similar): stay in
  `/grill-with-docs`, then `/to-spec`.
- **If no**, and the way to the destination genuinely is not visible: escalate to
  **`/wayfinder`**. It charts a map of decision tickets in the tracker and resolves them
  one at a time, producing decisions rather than deliverables, then hands off to
  `/to-spec` once the fog clears. It is slow and dense, so only escalate if the
  grilling shows the fog is real.

Do not go straight to `/wayfinder`. The repo already has more of the answer than the
phrase "iOS migration" suggests, for the reason in the next section.

## Read this before exploring

1. `CODEMAP.md`: the operational map. Read it first, per `AGENTS.md`.
2. `docs/overview.md`: intended architecture and guardrails.
3. `CONTEXT.md`: the domain glossary. Use its terms exactly; do not drift to synonyms.
4. `docs/agents/`: issue tracker, triage labels, and domain doc rules for this repo.

## Stack facts that bear on this decision

Verified 2026-09-01. These exist to save you the exploration, not to pre-empt the plan.

**The app is already an installable PWA.** `vite-plugin-pwa` is wired in
`vite.config.ts` with a workbox config and a web app manifest, and icons live at
`public/icon-192.svg` / `icon-512.svg`. This is the single biggest input to scoping: a
Capacitor-style wrap may be far cheaper than a rewrite, and it makes "migration" a
question of what iOS gives you that the PWA cannot, rather than a rebuild by default.
There is no Capacitor install and no Xcode project in the tree today.

**The UI layer is the cost centre.** React 18 + TypeScript + Vite SPA. The UI is
shadcn/ui on 26 `@radix-ui/*` packages, plus Tailwind, framer-motion, recharts,
and `@supabase/auth-ui-react`. All of that is DOM-only. A React Native path means
rewriting the entire UI layer; a Capacitor path keeps it. Whatever else the migration
touches, this is where the money is.

**The architecture already has the seam you need.** Domains are organised
`ui / hooks / data`, with `src/domains/*/data` as the I/O boundary, and pages, layout
components, and domain hooks are forbidden from importing Supabase directly. So the
DOM-bound surface is `ui`; `hooks` and `data` are closer to portable. The ten domains
are `account`, `analytics`, `breathwork`, `dashboard`, `fitness`, `goals`, `guidance`,
`habits`, `periodization`, `rpg`.

**Domain logic is already platform-agnostic.** Vitest suites run in a node environment
and cover domain logic without React or live Supabase. That test baseline ports to any
client and is worth protecting in the plan.

**The Coach survives any client migration.** It is one Vercel serverless function,
`api/coach.ts`, using the Vercel AI SDK against Anthropic, Google, and OpenAI. Server
side, so the client rewrite question does not reach it. App Store review of an
LLM-backed feature is a separate question worth raising.

**State**: React Query for server state, Redux Toolkit plus `redux-persist` for
cross-session global state. Backend is a single Supabase project (Postgres, RLS, SQL
views and RPCs).

## Open questions worth putting to Hank early

These are the ones where the answer changes the shape of the plan, roughly in order of
how much they move it:

- **What does iOS give you that the installable PWA does not?** If the honest answer is
  App Store presence alone, the plan is small. If it is the items below, it is not.
- **HealthKit.** This is a fitness and recovery app. Read/write access to Apple Health
  is the strongest native pull here and has no web equivalent. Is it in scope?
- **Push notifications.** The `guidance` domain runs a proactive engine. Web push on
  iOS is materially weaker than native. If proactive nudges matter, this may be the
  deciding constraint.
- **Offline.** `AGENTS.md` describes an offline/PWA thread involving
  `src/lib/offlineQueue.ts` and `src/hooks/useOfflineSync.ts`. **Neither file exists in
  any commit on any branch**, so that work never landed and offline sync is unbuilt.
  Native raises the expectation. Confirm with Hank whether that WIP still exists
  locally, and treat the `AGENTS.md` bullet as stale until he does.
- **Does the web app keep living alongside iOS**, or is iOS the replacement? One
  codebase or two is a hard-to-reverse call and belongs in an ADR.
- **Apple Developer account and signing**: in place, or a prerequisite? If it needs
  provisioning, that is a `/wizard` job for Hank, not something you can do.

## Where output goes

Tickets and decision tickets go to **Linear**, workspace `daimodus`, team `StratOS`,
project `Stratos`, through the Linear MCP server. Full conventions and two API traps
that will bite you are in `docs/agents/issue-tracker.md`. Read it before your first
write. GitHub Issues is not the tracker for this repo.

## Repo state

Clean tree on `main` at commit `54357ad`, which configured the agent skills and removed
the deprecated superpowers workflow. `docs/superpowers/` is gone; its 8 plans and 10
specs remain in git history if you need the design rationale behind shipped features.

Verification is `npm run build` then `npm run lint`, **run sequentially, never in
parallel**. Tests are `npm test`. You should not need any of them for planning work.
