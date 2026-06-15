# Performance Regression Fixes Design

Date: 2026-06-15

## Goal

Reduce protected-app startup blocking and initial protected bundle cost, while keeping long analytics histories usable without presenting sparse new accounts with an arbitrary three-month window.

## Decisions

- Redux persistence continues rehydrating immediately, but it no longer withholds the entire protected shell behind a blank `PersistGate` fallback. Screens render reducer defaults and update when persisted workout state arrives.
- The global Coach provider remains mounted for every protected route. It continues to own conversation continuity, provider validation, screen context, client/server tool orchestration, artifacts, navigation, attention state, and workout-draft application.
- Only the `propose_workout` implementation is lazy-loaded. The registered client-tool callback stays stable and dynamically imports the planning/data module when that tool is invoked.
- The estimated-1RM chart respects any saved time-range preference. When no preference exists, it starts at `ALL` and automatically selects `3M` only after the selected exercise's history is shown to span more than three calendar months.
- Automatic analytics selection is not persisted as an explicit user preference. A direct range-button choice is persisted and remains authoritative on future visits.

## Architecture

### Protected startup

`ProtectedAppShell` mounts the Redux provider, auth gate, and layout directly. Importing `store.ts` still creates the persistor and starts rehydration; removing `PersistGate` only removes render blocking.

### Coach planner split

`PresenceAgentProvider` imports a thin `useProposeWorkout` hook. That hook captures the current QueryClient, user id, and persisted workout history, then dynamically imports a focused proposal module inside the callback. The proposal module performs the existing catalog, mesocycle, weekly-volume, and planner work and returns the same typed workout-draft artifact.

Ordinary Coach messages, server-read tools, provider checks, conversation rendering, and deterministic quick actions do not load the planner chunk.

### Analytics default

A pure helper determines whether history spans more than three calendar months. `useOneRepMax` applies that helper once per selected exercise only when no saved preference exists. A one-workout history or any history contained within three months remains on `ALL`.

## Verification

- Add focused Vitest tests for the range helper covering empty, one-workout, short-span, boundary, and long-span histories.
- Run the production build and inspect generated chunks to confirm the proposal implementation is split from the protected shell.
- Run lint after build, sequentially per repository rules.
- Update `CODEMAP.md` because protected-shell startup and Coach runtime boundaries change.
