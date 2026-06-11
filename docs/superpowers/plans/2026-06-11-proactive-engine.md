# Proactive Engine + Tiered Surfacing (Sub-project 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deterministic gates notice notable training conditions on app open / workout finished and surface them as orb pulse or one-line peek; tapping a peek opens the summon surface and sends a seeded Coach prompt. Zero LLM calls until engagement.

**Architecture:** Pure gate + cooldown modules in `guidance/data`; a `useProactiveEngine` hook orchestrating triggers inside `PresenceAgentProvider`; a `PresencePeek` chip mounted in `MainAppLayout`; orb attention becomes conversation-attention ∪ proactive insights.

**Tech Stack:** React 18 + TS, React Query (cached snapshot data), Redux (history/workout state), localStorage cooldowns, tailwindcss-animate.

**Spec:** `docs/superpowers/specs/2026-06-11-proactive-engine-design.md`

## Verification rules (every task)

Sequentially, never in parallel: 1) `npm run build` 2) `npm run lint`. Baseline: 0 errors; 8 unique react-refresh warnings (double-reported as 16). No test runner; do not add one.

## File structure

**Create:**
- `src/domains/guidance/data/proactiveCooldowns.ts` — localStorage suppression store
- `src/domains/guidance/data/proactiveGates.ts` — insight types + pure gate derivation
- `src/domains/guidance/hooks/useProactiveEngine.ts` — trigger orchestration
- `src/domains/guidance/ui/PresencePeek.tsx` — floating one-line peek chip

**Modify:**
- `src/domains/guidance/hooks/usePresenceAgent.ts` — context additions
- `src/domains/guidance/hooks/PresenceAgentProvider.tsx` — mount engine, attention union
- `src/components/layout/MainAppLayout.tsx` — mount `PresencePeek`
- `CODEMAP.md`

---

### Task 1: Cooldown store

**Files:** Create `src/domains/guidance/data/proactiveCooldowns.ts`

- [ ] **Step 1: Write the module**

```ts
interface CooldownEntry {
  suppressedUntil: string;
}

type CooldownMap = Record<string, CooldownEntry>;

const storageKey = (userId: string) => `stratos.coach.proactive.${userId}`;

export const cooldownKey = (insightId: string, dedupeKey?: string) =>
  dedupeKey ? `${insightId}:${dedupeKey}` : insightId;

const readCooldowns = (userId: string): CooldownMap => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as CooldownMap) : {};
  } catch {
    return {};
  }
};

const writeCooldowns = (userId: string, map: CooldownMap): void => {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(map));
  } catch {
    // Storage unavailable: cooldowns degrade to session memory (engine state).
  }
};

export const isSuppressed = (
  userId: string,
  key: string,
  now: Date = new Date()
): boolean => {
  const entry = readCooldowns(userId)[key];
  if (!entry) return false;
  return new Date(entry.suppressedUntil).getTime() > now.getTime();
};

export const suppress = (
  userId: string,
  key: string,
  hours: number,
  now: Date = new Date()
): void => {
  const map = readCooldowns(userId);
  map[key] = {
    suppressedUntil: new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString(),
  };
  writeCooldowns(userId, map);
};
```

- [ ] **Step 2: Verify** — `npm run build` then `npm run lint` (baseline)
- [ ] **Step 3: Commit** — `git add src/domains/guidance/data/proactiveCooldowns.ts && git commit -m "feat(coach): proactive cooldown store"`

---

### Task 2: Gates

**Files:** Create `src/domains/guidance/data/proactiveGates.ts`

- [ ] **Step 1: Write the module**

```ts
import { differenceInCalendarDays, startOfDay } from "date-fns";

import type { DisplayArchetypeData } from "@/domains/analytics/data/volumeProgress";
import type { ActiveMesocycleProgram } from "@/domains/periodization";
import type { Workout } from "@/lib/types/workout";

export type ProactiveTier = "pulse" | "peek";
export type ProactiveTrigger = "app_open" | "workout_finished";

export interface ProactiveInsight {
  id: string;
  tier: ProactiveTier;
  line: string;
  seedPrompt: string;
  cooldownHours: number;
  dedupeKey?: string;
}

export interface ProactiveGateSnapshot {
  trigger: ProactiveTrigger;
  now: Date;
  activeProgram: ActiveMesocycleProgram | null;
  workoutHistory: Workout[];
  volumeProgress: DisplayArchetypeData[];
  finishedWorkoutId?: string | null;
}

const MISSED_TRAINING_DAYS = 4;
const VOLUME_GAP_RATIO = 0.5;
const LATE_WEEK_FIRST_DAY = 5; // Friday (Monday = 1)

const isoWeekday = (date: Date): number => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const hoursUntilNextWeek = (now: Date): number => {
  const daysLeft = 8 - isoWeekday(now); // through end of Sunday
  return Math.max(1, daysLeft * 24 - now.getHours());
};

const daysSinceLastWorkout = (history: Workout[], now: Date): number | null => {
  if (history.length === 0) return null;
  const latest = history.reduce<Date | null>((latestDate, workout) => {
    const date = startOfDay(new Date(workout.date));
    return !latestDate || date > latestDate ? date : latestDate;
  }, null);
  if (!latest) return null;
  return differenceInCalendarDays(startOfDay(now), latest);
};

export const deriveProactiveInsights = (
  snapshot: ProactiveGateSnapshot
): ProactiveInsight[] => {
  const { trigger, now, activeProgram, workoutHistory, volumeProgress } = snapshot;

  if (trigger === "workout_finished") {
    if (!snapshot.finishedWorkoutId) return [];
    return [
      {
        id: "workout_finished",
        tier: "peek",
        line: "Session logged. Want a quick read on it?",
        seedPrompt:
          "I just finished a workout. Give me a quick read and anything to adjust.",
        cooldownHours: 720,
        dedupeKey: snapshot.finishedWorkoutId,
      },
    ];
  }

  const insights: ProactiveInsight[] = [];

  if (activeProgram && activeProgram.current_week >= activeProgram.mesocycle.duration_weeks) {
    insights.push({
      id: "program_ending",
      tier: "peek",
      line: "Your training block ends this week — want me to plan the next one?",
      seedPrompt:
        "My current program is ending. Review how it went and propose the next block.",
      cooldownHours: 72,
    });
  }

  const restDays = daysSinceLastWorkout(workoutHistory, now);
  if (restDays !== null && restDays >= MISSED_TRAINING_DAYS) {
    insights.push({
      id: "missed_training",
      tier: "peek",
      line: `It's been ${restDays} days since your last session — want a plan for today?`,
      seedPrompt: "It's been a few days since I trained. Propose a session for today.",
      cooldownHours: 48,
    });
  }

  if (isoWeekday(now) >= LATE_WEEK_FIRST_DAY) {
    const lagging = volumeProgress
      .filter(
        (archetype) =>
          archetype.goal > 0 &&
          archetype.totalSets < archetype.goal * VOLUME_GAP_RATIO
      )
      .sort(
        (left, right) =>
          left.totalSets / left.goal - right.totalSets / right.goal
      )[0];
    if (lagging) {
      insights.push({
        id: "volume_gap_late_week",
        tier: "peek",
        line: `${lagging.name} volume is behind this week (${lagging.totalSets}/${lagging.goal} sets).`,
        seedPrompt:
          "Where is my training volume behind this week, and what should I do about it?",
        cooldownHours: hoursUntilNextWeek(now),
      });
    }
  }

  if (!activeProgram) {
    insights.push({
      id: "no_active_program",
      tier: "pulse",
      line: "No active program — ask the coach to build one.",
      seedPrompt: "Help me set up a training program.",
      cooldownHours: 168,
    });
  }

  return insights;
};
```

- [ ] **Step 2: Verify** — build then lint (baseline)
- [ ] **Step 3: Commit** — `git add src/domains/guidance/data/proactiveGates.ts && git commit -m "feat(coach): deterministic proactive gates"`

---

### Task 3: Engine hook + provider wiring

**Files:**
- Create `src/domains/guidance/hooks/useProactiveEngine.ts`
- Modify `src/domains/guidance/hooks/usePresenceAgent.ts`
- Modify `src/domains/guidance/hooks/PresenceAgentProvider.tsx`

- [ ] **Step 1: Write `useProactiveEngine.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

import {
  fetchWeeklyArchetypeSets,
} from "@/domains/analytics/data/analyticsRepository";
import {
  buildVolumeProgressDisplayData,
  getCurrentWeekRange,
} from "@/domains/analytics/hooks/useVolumeChart";
import {
  cooldownKey,
  isSuppressed,
  suppress,
} from "@/domains/guidance/data/proactiveCooldowns";
import {
  deriveProactiveInsights,
  type ProactiveInsight,
  type ProactiveTrigger,
} from "@/domains/guidance/data/proactiveGates";
import { getActiveMesocycleProgram } from "@/domains/periodization/data/repository";
import { useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectWorkoutHistory } from "@/state/history/historySlice";
import {
  selectCurrentWorkout,
  selectIsWorkoutActive,
} from "@/state/workout/workoutSlice";

interface UseProactiveEngineParams {
  summon: () => void;
  send: (text?: string) => Promise<void>;
  isOpen: boolean;
  isLoading: boolean;
}

export const useProactiveEngine = ({
  summon,
  send,
  isOpen,
  isLoading,
}: UseProactiveEngineParams) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user } = useAuth();
  const workoutHistory = useAppSelector(selectWorkoutHistory);
  const isWorkoutActive = useAppSelector(selectIsWorkoutActive);
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const userId = user?.id ?? null;

  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const workoutHistoryRef = useRef(workoutHistory);
  workoutHistoryRef.current = workoutHistory;

  const runGates = useCallback(
    async (trigger: ProactiveTrigger, finishedWorkoutId?: string | null) => {
      if (!userId) return;
      try {
        const weekRange = getCurrentWeekRange();
        const [activeProgram, weeklySets] = await Promise.all([
          queryClient.ensureQueryData({
            queryKey: ["activeMesocycleProgram", userId],
            queryFn: () => getActiveMesocycleProgram(userId),
            staleTime: 60 * 1000,
          }),
          queryClient.ensureQueryData({
            queryKey: [
              "weeklyArchetypeSets_v2",
              userId,
              weekRange.start,
              weekRange.end,
            ],
            queryFn: () =>
              fetchWeeklyArchetypeSets(userId, weekRange.start, weekRange.end),
            staleTime: 5 * 60 * 1000,
          }),
        ]);

        const derived = deriveProactiveInsights({
          trigger,
          now: new Date(),
          activeProgram,
          workoutHistory: workoutHistoryRef.current,
          volumeProgress: buildVolumeProgressDisplayData(weeklySets),
          finishedWorkoutId: finishedWorkoutId ?? null,
        }).filter(
          (insight) =>
            !isSuppressed(userId, cooldownKey(insight.id, insight.dedupeKey))
        );

        setInsights((previous) =>
          trigger === "app_open"
            ? derived
            : [
                ...derived,
                ...previous.filter(
                  (existing) =>
                    !derived.some((incoming) => incoming.id === existing.id)
                ),
              ]
        );
      } catch {
        // Proactivity must never surface an error state.
      }
    },
    [queryClient, userId]
  );

  // App open: once per authenticated mount.
  const ranInitialRef = useRef(false);
  useEffect(() => {
    if (!userId || ranInitialRef.current) return;
    ranInitialRef.current = true;
    void runGates("app_open");
  }, [userId, runGates]);

  // Re-check when navigating to home (cooldowns keep this quiet).
  const previousPathRef = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname === "/" && previousPathRef.current !== "/") {
      void runGates("app_open");
    }
    previousPathRef.current = location.pathname;
  }, [location.pathname, runGates]);

  // Workout finished: true -> false edge of the active-workout flag.
  const previousWorkoutRef = useRef<{ active: boolean; id: string | null }>({
    active: isWorkoutActive,
    id: currentWorkout?.id ?? null,
  });
  useEffect(() => {
    const previous = previousWorkoutRef.current;
    if (previous.active && !isWorkoutActive && previous.id) {
      void runGates("workout_finished", previous.id);
    }
    previousWorkoutRef.current = {
      active: isWorkoutActive,
      id: currentWorkout?.id ?? null,
    };
  }, [isWorkoutActive, currentWorkout?.id, runGates]);

  // Opening the surface counts as "the user looked": clear pulse-only insights.
  useEffect(() => {
    if (isOpen) {
      setInsights((previous) =>
        previous.filter((insight) => insight.tier === "peek")
      );
    }
  }, [isOpen]);

  const engageInsight = useCallback(
    (insight: ProactiveInsight) => {
      if (!userId || isLoading) return;
      suppress(
        userId,
        cooldownKey(insight.id, insight.dedupeKey),
        insight.cooldownHours
      );
      setInsights((previous) =>
        previous.filter((existing) => existing.id !== insight.id)
      );
      summon();
      void send(insight.seedPrompt);
    },
    [isLoading, send, summon, userId]
  );

  const dismissInsight = useCallback(
    (insight: ProactiveInsight) => {
      if (!userId) return;
      suppress(
        userId,
        cooldownKey(insight.id, insight.dedupeKey),
        insight.cooldownHours
      );
      setInsights((previous) =>
        previous.filter((existing) => existing.id !== insight.id)
      );
    },
    [userId]
  );

  return { insights, engageInsight, dismissInsight };
};
```

- [ ] **Step 2: Extend `usePresenceAgent.ts`**

```ts
import type { ProactiveInsight } from "@/domains/guidance/data/proactiveGates";
```

Add to `PresenceAgentContextValue`:

```ts
  proactiveInsights: ProactiveInsight[];
  engageInsight: (insight: ProactiveInsight) => void;
  dismissInsight: (insight: ProactiveInsight) => void;
```

- [ ] **Step 3: Wire in `PresenceAgentProvider.tsx`**

After the `send` callback definition:

```ts
const {
  insights: proactiveInsights,
  engageInsight,
  dismissInsight,
} = useProactiveEngine({ summon, send, isOpen, isLoading });
```

Attention union — replace the `hasAttention` usage in the memoized value with:

```ts
      hasAttention: hasAttention || proactiveInsights.length > 0,
```

Add `proactiveInsights`, `engageInsight`, `dismissInsight` to the value object and both dependency arrays. Import `useProactiveEngine`.

- [ ] **Step 4: Verify** — build then lint (baseline)
- [ ] **Step 5: Commit** — `git add src/domains/guidance && git commit -m "feat(coach): proactive engine hook wired into presence provider"`

---

### Task 4: Peek chip + mount

**Files:**
- Create `src/domains/guidance/ui/PresencePeek.tsx`
- Modify `src/components/layout/MainAppLayout.tsx`

- [ ] **Step 1: Write `PresencePeek.tsx`**

```tsx
import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

const AUTO_HIDE_MS = 12000;

const PresencePeek = () => {
  const { proactiveInsights, engageInsight, dismissInsight, isOpen, isLoading } =
    usePresenceAgent();
  const peek = proactiveInsights.find((insight) => insight.tier === "peek");
  const [autoHidden, setAutoHidden] = useState(false);

  useEffect(() => {
    setAutoHidden(false);
    if (!peek) return undefined;
    const timer = window.setTimeout(() => setAutoHidden(true), AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [peek?.id, peek?.dedupeKey]);

  if (!peek || isOpen || isLoading || autoHidden) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)] md:bottom-6">
      <div className="pointer-events-auto flex max-w-sm items-center gap-1 rounded-full border border-[#2f3a36] bg-[#1a221f]/95 py-1.5 pl-4 pr-1.5 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-2">
        <button
          type="button"
          onClick={() => engageInsight(peek)}
          className="text-left text-xs text-foreground"
        >
          {peek.line}
        </button>
        <button
          type="button"
          aria-label="Dismiss suggestion"
          onClick={() => dismissInsight(peek)}
          className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default PresencePeek;
```

- [ ] **Step 2: Mount in `MainAppLayout.tsx`** — import `PresencePeek` from `@/domains/guidance/ui/PresencePeek` and render `<PresencePeek />` immediately after the `<SummonSurface … />` element.

- [ ] **Step 3: Verify** — build then lint (baseline)
- [ ] **Step 4: Commit** — `git add src/domains/guidance/ui/PresencePeek.tsx src/components/layout/MainAppLayout.tsx && git commit -m "feat(coach): tethered peek chip above the presence orb"`

---

### Task 5: CODEMAP + final verification

**Files:** Modify `CODEMAP.md`

- [ ] **Step 1: Update CODEMAP** — guidance entrypoints (`hooks/useProactiveEngine.ts`, `data/proactiveGates.ts`, `data/proactiveCooldowns.ts`, `ui/PresencePeek.tsx`); presence state note (orb attention = conversation attention ∪ proactive insights; peek chip mounted in `MainAppLayout`); Coach architecture summary (proactive layer: deterministic gates on app-open/workout-finished, template peek lines, LLM only on engagement, localStorage cooldowns, propose-only).

- [ ] **Step 2: Final verification** — `npm run build` then `npm run lint` (baseline)

- [ ] **Step 3: Manual checks** — fresh user (no program): orb pulses; block in final week: peek line appears, tap opens surface + sends seed prompt; dismiss suppresses across reload (localStorage `stratos.coach.proactive.<userId>`); finishing a workout raises the post-session peek once; network tab shows no `/api/coach` calls from triggers alone.

- [ ] **Step 4: Commit** — `git add CODEMAP.md && git commit -m "docs(codemap): proactive engine, gates, peek surfacing"`
