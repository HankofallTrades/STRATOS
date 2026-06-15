# Performance Regression Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove blank protected-shell rehydration blocking, defer Coach workout planning until its tool is invoked, and choose a sensible estimated-1RM default window from observed history.

**Architecture:** Keep Redux persistence and the global Coach provider active, but remove their avoidable startup costs. Extract the Coach proposal implementation behind a dynamic import, and isolate analytics range selection in a pure tested helper.

**Tech Stack:** React 18, TypeScript, Redux Toolkit, redux-persist, TanStack Query, Vite, Vitest

---

### Task 1: Adaptive analytics range

**Files:**
- Create: `src/domains/analytics/data/oneRepMaxRange.ts`
- Create: `src/domains/analytics/data/oneRepMaxRange.test.ts`
- Modify: `src/domains/analytics/hooks/useOneRepMax.ts`

- [x] Write Vitest tests proving `ALL` is retained for empty, single-point, short-span, and exact three-month histories, while histories longer than three calendar months select `3M`.
- [x] Run `npm test -- src/domains/analytics/data/oneRepMaxRange.test.ts` and confirm failure because the helper does not exist.
- [x] Implement `getAutomaticTimeRange` as a pure calendar-month comparison.
- [x] Update `useOneRepMax` to read an optional saved preference once, apply the automatic range once per exercise only without a saved preference, and persist only direct user selections.
- [x] Run the focused Vitest test and confirm all cases pass.

### Task 2: Lazy Coach proposal implementation

**Files:**
- Create: `src/domains/guidance/hooks/useProposeWorkout.ts`
- Modify: `src/domains/guidance/hooks/PresenceAgentProvider.tsx`
- Modify: `src/domains/guidance/hooks/useWorkoutGenerator.ts`

- [x] Convert the existing proposal hook body into an exported async planner entry without changing query keys, stale times, planner inputs, or output shape.
- [x] Add a thin hook that captures QueryClient, user id, and workout history, then dynamically imports the planner module and calls that entry only when `propose_workout` executes.
- [x] Point `PresenceAgentProvider` at the thin hook and remove proposal-only imports from the eager provider path.
- [x] Confirm through the production build chunk list that `useWorkoutGenerator` is emitted separately from the protected shell.

### Task 3: Non-blocking Redux rehydration

**Files:**
- Modify: `src/components/layout/ProtectedAppShell.tsx`

- [x] Remove `PersistGate` while retaining the Redux provider and store import so persistence still initializes.
- [x] Verify the store module still creates the persistor and the protected shell no longer waits for its bootstrapped render gate.

### Task 4: Architecture documentation and verification

**Files:**
- Modify: `CODEMAP.md`

- [x] Document non-blocking protected-shell rehydration, planner-only Coach lazy loading, and adaptive analytics range behavior.
- [x] Install dependencies with `npm ci` if `node_modules` is absent.
- [x] Run `npm run build` and require exit code 0.
- [x] Run `npm run lint` only after build completes and require no errors.
- [x] Review `git diff --check`, `git diff --stat`, and the final diff for unrelated changes.
