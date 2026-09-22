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

## Workout start

Beginning a workout crosses exactly one interface, `startWorkoutSession`, which
takes an **intent** and returns `started`, `already-active`, or `failed`. The
intents are `quick` (optionally with a session focus), `program-session` (a
template session from the active program), `custom-session` (a new session row
in the active block, created on the way in), and `plan` (a session someone else
already planned: the generator or the Coach). The module derives the session's
mesocycle fields, loads template exercises, and refuses to start over a workout
in progress. Navigation and cache invalidation stay with the caller.

_Avoid_: start payload, workout kickoff

## Set completion

Logging a set crosses exactly one interface, `completeSetFromDraft`, which takes
the **draft** the user typed, the previous performance for that set number, and
the **set kind** (`strength`, `time`, `cardio`), and returns either accepted —
the draft fields to fill in plus the set as it should be stored — or rejected
with a reason. It owns every auto-fill rule: carrying last session's numbers into
blank fields, standing the user's bodyweight in for an unloaded movement with no
history, and refusing a set with no reps, no hold, or no duration.

It is pure, so the Activity Journal replays a lock-screen completion through the
same rule. The store learns about it through one action, and rest timer and
haptic feedback listen for that action rather than being handed a callback.

_Avoid_: set save, completion handler

## Auto-add

Completing the **last** set of an exercise opens a fresh one, so a set is always
waiting without anyone reaching for Add Set. `shouldAutoAddSet` owns when that
stops: an exercise stops opening sets once it holds as many as it performed the
last time it was trained, or three where it has no history to match.

The stopping is the point. Auto-add that never stops leaves every exercise
holding one open set forever, and since the Set Plan's current entry is the
first set still open, the lock screen would stay on the first exercise of the
session no matter how much of the workout was done. Matching last session is
what lets an exercise be finished, and history is already what the suggestions
are built from, so the two cannot disagree about how long an exercise is.

Stopping is not a ceiling: Add Set still opens an extra set whenever the user
wants one, and an exercise the user cuts short simply leaves its last set
unlogged.

History is fetched, so "never trained" and "not arrived yet" reach the rule as
the same nothing. While it is still loading the rule opens a set rather than
stopping, because the question is only ever asked at the moment a set is
completed: a cap guessed too early would stand for the rest of the session.

_Avoid_: set cap, auto-create

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

Each entry carries both a **suggestion** and a **target**. The suggestion is what
the progression rules recommend, and there may not be one. The target is what
logging that set right now would record: the set's own numbers where it has
them, and the suggestion for the fields it leaves blank. A suggestion is offered,
never imposed — it cannot outrank a number the user has already put on the set,
from the workout row or from the lock screen's steppers. Weight says so on the
set itself (`weightChosen`), because zero weight is an unloaded lift rather than
a blank and the two are otherwise the same number. The workout screen
renders suggestions; the lock screen shows and logs targets, because a Done
button needs a number for every set, not only the ones with a recommendation.

A target is a **`SetTarget`**: reps, weight, time, distance, travelling as one
thing wherever a set goes. A number it could not resolve is absent rather than
zero, and the two can mean different things — zero weight is a bodyweight lift,
not a weight nobody supplied. Where Set completion refuses zero as well as none,
as it does for reps and for a hold, zero is instead the blank an untouched set
carries, and the Set Plan fills it from the suggestion rather than reading it as
a choice.

An entry also carries a **`SetAdjustment`**: how far one lock-screen stepper tap
moves each field of the target, and how far down it may go. Both halves are
resolved on the web, because the step a tap produces is the app's rule about how
weight and reps move — the same one the in-app stepper obeys — and the floor is
the loggability rule seen from the other end: a set must not be steppable into
something a Done tap would then fail to log.

Which entry is *current* — the first one still open, and the last one once they
all are — is stated twice: `currentLiveActivitySet` on the web, and
`StratosActivityCursor` in Swift, which has to walk it after a Done tap with no
webview to ask. The two must agree. So is the stepper arithmetic:
`adjustSetTarget` on the web, `StratosSetAdjustment.applied` in Swift.

_Avoid_: workout snapshot, session plan

## Activity Journal

The natively-recorded sequence of lock-screen actions taken in the Live Activity
(set completed, reps or weight adjusted). Replayed into workout state when the
app next foregrounds — "reconcile on reopen". The journal is the source of truth
for what happened while the webview was suspended. It is never a parallel workout
state: it records that a button was pressed and what the lock screen was showing
at the time, and `replayActivityJournal` decides what that is worth by running it
through the same `completeSetFromDraft` rule the checkbox uses.

An entry is either a **completion** or an **adjustment**, and the difference is
only what the press was for: an adjustment replays as a value edit and leaves the
set open, a completion logs it. A run of stepper taps on one set is one decision
arrived at in stages, so replay keeps the last of them and drops it entirely when
a completion followed, which already carries the same numbers.

Replay is pure and idempotent — a set the workout already has completed is
skipped — so the journal is cleared only *after* its completions are dispatched,
and only through the last entry that was read. Failing that way round replays an
entry twice, which costs nothing; the other way round loses a logged set.

Replay is also what Finish waits for. A set logged on the lock screen reaches the
workout one bridge round trip after the app foregrounds, and Finish is tappable
throughout, so the commit takes its snapshot on the far side of a replay rather
than racing it — and so does the question of whether the session has anything
worth saving, which would otherwise offer to discard a workout whose only logged
set was still in the journal. Passes are queued rather than dropped, because
"one is already running" is the answer Finish must not accept.

A replayed adjustment is written into the set itself, and the Set Plan targets a
set's own numbers ahead of any suggestion, so the whole journal is cleared once
it has been replayed. Neither surface is the authority on an adjusted set: the
numbers are on the set, and an edit from either side is the last word until the
other edits it.

_Avoid_: native event log, sync queue
