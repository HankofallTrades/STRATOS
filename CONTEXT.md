# CONTEXT — STRATOS domain glossary

Shared vocabulary for the codebase. Architecture-review and design conversations
should use these terms exactly so names stay stable across sessions. (Domain
terms here; architecture terms like *module / interface / seam / deep / shallow*
come from the architecture-review language, not this file.)

## Coach

The in-app LLM agent (presence orb + summon surface). Conversation state is
ephemeral; each turn sends a read-only `ScreenContext`. Mutations are
confirm-only and recorded in a change log with one-tap revert.

## Coach tool

A capability the Coach can invoke during a turn. Each tool executes either on
the **server** (Vercel function, Supabase-backed) or on the **client** (React
hooks). Read tools return a message/data; propose tools return a draft
**artifact** the user reviews and applies — they never save on their own.

## Coach tool registry

`coachToolRegistry` in `src/domains/guidance/agent/tools.ts`: the single,
environment-free spine of `CoachToolDescriptor`s (name, label, description,
input schema, execution environment). It is the one place a tool is declared;
the server runtime, the client send loop, and message replay all read from it
instead of re-enumerating tools. `as const satisfies Record<CoachToolName, …>`
makes a missing or extra tool a compile error, and the execution environment is
single-sourced here (no parallel execution map).

## Tool builder

A pure function in `src/domains/guidance/data/toolBuilders.ts` of the shape
`buildX(validatedInput, injectedDeps) -> CoachToolResultPayload`, or it throws
an `Error` whose message is shown back to the model (e.g. an unresolved exercise
name, listing the catalog). Builders contain the client tools' logic and own the
unit-test surface; React hooks (`useProgramActions`, `useProposeWorkout`) only
fetch the catalog/program/workout deps and call the builder. No React,
react-query, or Supabase inside a builder.

## Client tool runner / runner map

`useClientCoachToolRunners()` returns `CoachClientToolRunners` — the
client-executed tools keyed by name. The send loop in `PresenceAgentProvider`
looks a tool up here instead of switching on its name. Typed as a `Record` over
the registry's client tools, so a client tool without a runner is a compile
error.

## Coach mutation / mutation registry

A **Coach mutation** is a confirm-only change the Coach can make on the user's
behalf (`program_created`, `program_edited`, `workout_edited` — the
`CoachChangeType` union). The **mutation registry** (`coachMutationRegistry` in
`src/domains/guidance/data/coachMutations.ts`) makes each one a command
descriptor owning its forward op (`apply`), its inverse (`revert`), its
revertibility rule (`canRevert`), and the zod schema of the change-log payload
both sides share — apply writes it, revert parses it, so payload drift is a
compile error and a malformed legacy row is a clean parse failure.
`useCoachMutations().applyMutation(type, input)` is the one apply path (shared
tail: change-log insert, invalidation, toast); `useCoachChangeLog` reverts
through `revertCoachChange`/`canRevertCoachChange`. Neither hook inspects a
payload itself.

## Artifact / artifact registry

A `CoachArtifact` is the typed, reviewable result a propose tool emits
(`volume_chart`, `workout_draft`, `program_draft`, `program_edit`,
`workout_edit`). The **artifact registry** in
`src/domains/guidance/ui/ArtifactRenderer.tsx` maps each artifact type to its
renderer; `Record<CoachArtifact["type"], …>` keeps it in lockstep with the
union. Applying an artifact goes through a single `applyArtifact(artifact)` on
the presence context, which routes by `artifact.type` to the right confirm-only
handler — artifact UI never names a handler.
