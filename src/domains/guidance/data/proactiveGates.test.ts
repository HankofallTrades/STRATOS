import { describe, expect, it } from "vitest";

import {
  deriveProactiveInsights,
  type ProactiveGateSnapshot,
} from "./proactiveGates";
import type { DisplayArchetypeData } from "@/domains/analytics/data/volumeProgress";
import type { ActiveMesocycleProgram } from "@/domains/periodization";
import type { Workout } from "@/lib/types/workout";

// Local-midday timestamps keep getDay()/startOfDay() stable across timezones.
const FRIDAY = new Date("2026-06-12T12:00:00");
const WEDNESDAY = new Date("2026-06-10T12:00:00");

const program = (
  current_week: number,
  duration_weeks: number
): ActiveMesocycleProgram =>
  ({
    current_week,
    mesocycle: { duration_weeks },
  } as unknown as ActiveMesocycleProgram);

const workoutOn = (localDateTime: string): Workout =>
  ({ date: localDateTime } as unknown as Workout);

const archetype = (
  name: DisplayArchetypeData["name"],
  totalSets: number,
  goal: number
): DisplayArchetypeData => ({
  name,
  totalSets,
  goal,
  verticalSets: 0,
  horizontalSets: 0,
  displayColor: "#000000",
});

const snapshot = (
  overrides: Partial<ProactiveGateSnapshot>
): ProactiveGateSnapshot => ({
  trigger: "app_open",
  now: WEDNESDAY,
  activeProgram: program(2, 8),
  workoutHistory: [workoutOn("2026-06-09T12:00:00")],
  volumeProgress: [],
  ...overrides,
});

const ids = (snap: ProactiveGateSnapshot) =>
  deriveProactiveInsights(snap).map((i) => i.id);

describe("deriveProactiveInsights — workout_finished", () => {
  it("ties the post-session nudge to the specific finished workout", () => {
    // The dedupeKey must be the workout id so the same session is never
    // nudged twice.
    const insights = deriveProactiveInsights(
      snapshot({ trigger: "workout_finished", finishedWorkoutId: "w-123" })
    );
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe("workout_finished");
    expect(insights[0].tier).toBe("peek");
    expect(insights[0].dedupeKey).toBe("w-123");
  });

  it("stays silent if no workout id was supplied", () => {
    // Defends against firing a 'session logged' nudge when nothing was logged.
    expect(
      deriveProactiveInsights(snapshot({ trigger: "workout_finished" }))
    ).toEqual([]);
  });
});

describe("deriveProactiveInsights — app_open", () => {
  it("offers to plan the next block when the mesocycle is ending", () => {
    expect(ids(snapshot({ activeProgram: program(8, 8) }))).toContain(
      "program_ending"
    );
  });

  it("re-engages after a 4+ day training gap, and not before", () => {
    // 2026-06-07 -> 2026-06-12 is a 5-day gap: surface it.
    expect(
      ids(
        snapshot({
          now: FRIDAY,
          workoutHistory: [workoutOn("2026-06-07T12:00:00")],
        })
      )
    ).toContain("missed_training");
    // A session yesterday is not a gap.
    expect(
      ids(
        snapshot({
          now: FRIDAY,
          workoutHistory: [workoutOn("2026-06-11T12:00:00")],
        })
      )
    ).not.toContain("missed_training");
  });

  it("flags lagging volume only late in the week", () => {
    const behind = [archetype("Pull", 3, 10)]; // 3 < 50% of 10
    expect(ids(snapshot({ now: FRIDAY, volumeProgress: behind }))).toContain(
      "volume_gap_late_week"
    );
    // Same deficit mid-week is too early to nag about.
    expect(
      ids(snapshot({ now: WEDNESDAY, volumeProgress: behind }))
    ).not.toContain("volume_gap_late_week");
  });

  it("surfaces the single most-behind archetype by goal ratio", () => {
    const insights = deriveProactiveInsights(
      snapshot({
        now: FRIDAY,
        volumeProgress: [
          archetype("Pull", 4, 10), // 40% of goal
          archetype("Push", 1, 10), // 10% of goal -> furthest behind
        ],
      })
    );
    const gap = insights.find((i) => i.id === "volume_gap_late_week");
    expect(gap?.line).toContain("Push");
  });

  it("nudges to create a program when none is active", () => {
    const insights = deriveProactiveInsights(
      snapshot({ activeProgram: null })
    );
    const noProgram = insights.find((i) => i.id === "no_active_program");
    expect(noProgram?.tier).toBe("pulse");
  });

  it("is a pure function of its snapshot (same input, same output)", () => {
    // The engine must be deterministic so cooldowns/dedupe behave predictably.
    const snap = snapshot({
      now: FRIDAY,
      activeProgram: null,
      volumeProgress: [archetype("Pull", 3, 10)],
    });
    expect(deriveProactiveInsights(snap)).toEqual(deriveProactiveInsights(snap));
  });
});
