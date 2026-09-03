# CONTEXT — STRATOS domain glossary

Shared vocabulary for the codebase. Architecture-review and design conversations
should use these terms exactly so names stay stable across sessions.

This file defines what the concepts *mean*. It deliberately holds no file paths,
no implementation detail and no architectural decisions — read those from the
code, from `AGENTS.md`, and from `docs/adr/`. Identifier names appear only where
the name *is* the term.

## Coach

The in-app LLM agent, reached through the presence orb and the summon surface.
Conversation state is ephemeral. Each turn sends a read-only **ScreenContext**.
Every change the Coach makes is confirm-only and lands in a change log with
one-tap revert.

## Coach tool

A capability the Coach can invoke during a turn. Each tool executes either on the
**server** or on the **client**; that environment is part of the tool's
declaration, not a separate decision made at call time.

Two kinds, and the distinction matters: a **read tool** returns a message or
data, while a **propose tool** returns a draft **artifact** for the user to
review and apply. A propose tool never saves on its own.

## Coach tool registry

`coachToolRegistry` — the single, environment-free spine declaring every Coach
tool: its name, label, description, input schema, and execution environment. It
is the one place a tool is declared. The server runtime, the client send loop,
and message replay all read from it rather than re-enumerating tools, and a
missing or extra tool is a compile error rather than a runtime surprise.

## Tool builder

A pure function holding one client tool's logic: it takes validated input plus
injected dependencies and returns a result payload, or throws with a message
shown back to the model (an unresolved exercise name, say, listing the catalog).
Builders own the unit-test surface for client tools. Hooks around them only
gather dependencies and call the builder — a builder itself stays free of React,
react-query and Supabase.

## Client tool runner / runner map

The set of client-executed tools keyed by name. The send loop looks a tool up
here rather than switching on its name, and a client tool declared without a
runner is a compile error.

## Home model

The pure derivation behind everything the home screen shows: greeting, display
name, today's session card, movement streak, habit items, and recent PR and
workout summaries. Its hook gathers the sources — auth, workout state,
periodization, habits, snapshot query — and feeds the model; the model itself
does no I/O.

## Workout commit

Completing a workout crosses exactly one interface, `commitFinalizedWorkout`,
which returns `saved`, `queued`, or `failed`. It owns the whole tail: persist,
fall back to the offline queue, then settle workout history. Online save and
offline replay are its two adapters, and they own only what genuinely differs
between them — toasts, navigation, and cache-invalidation timing.

## Coach mutation / mutation registry

A **Coach mutation** is a confirm-only change the Coach can make on the user's
behalf: `program_created`, `program_edited`, `workout_edited`.

The **mutation registry** makes each one a command that owns its forward
operation, its inverse, its revertibility rule, and the schema of the change-log
payload both directions share — so apply and revert cannot drift apart, and a
malformed legacy row fails as a clean parse error. There is one apply path and
one revert path; neither inspects a payload itself.

## Artifact / artifact registry

A **CoachArtifact** is the typed, reviewable result a propose tool emits:
`volume_chart`, `workout_draft`, `program_draft`, `program_edit`, `workout_edit`.

The **artifact registry** maps each artifact type to its renderer, kept in
lockstep with the union. Applying an artifact goes through a single entry point
that routes by artifact type to the right confirm-only handler — artifact UI
never names a handler directly.

## Set Plan

The precomputed list of every set in the active workout session — exercise,
suggested reps, suggested weight — handed to the native layer when a workout
starts. Derived once from the existing recommendation logic so the Live Activity
can walk it without calling into the suspended webview.

_Avoid_: workout snapshot, session plan

## Activity Journal

The natively-recorded sequence of lock-screen actions taken in the Live Activity
(set completed, reps or weight adjusted). Replayed into workout state when the
app next foregrounds — "reconcile on reopen". The journal is the source of truth
for what happened while the webview was suspended. It is never a parallel workout
state.

_Avoid_: native event log, sync queue
