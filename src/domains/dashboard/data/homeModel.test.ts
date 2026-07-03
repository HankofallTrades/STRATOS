import { describe, expect, it } from "vitest";

import {
  buildHomeModel,
  type HomeModelInputs,
} from "@/domains/dashboard/data/homeModel";
import type { RecentWorkoutSummary } from "@/domains/analytics/data/analyticsRepository";
import type { HabitRow } from "@/domains/habits/data/types";
import type { ActiveMesocycleProgram } from "@/domains/periodization";
import type { Workout } from "@/lib/types/workout";

const TODAY = "2026-07-02";

const habit = (id: string, title: string): HabitRow =>
  ({ id, title }) as HabitRow;

const baseInputs: HomeModelInputs = {
  todayIso: TODAY,
  hour: 9,
  profile: null,
  userMetadataName: null,
  userEmail: null,
  recentWorkouts: [],
  recentPrRows: [],
  movementCompletionDates: [],
  isLoadingSnapshot: false,
  habits: [],
  completions: {},
  pendingIds: {},
  isLoadingCompletions: false,
  activeProgram: null,
  currentWorkout: null,
};

const program = (overrides: {
  sessions: Array<{ id: string; name: string; exercises: Array<{ exercise: { name: string } | null }> }>;
  nextSessionId?: string;
  protocol?: string;
  goalFocus?: string;
}): ActiveMesocycleProgram =>
  ({
    sessions: overrides.sessions,
    next_session_id: overrides.nextSessionId ?? null,
    mesocycle: {
      protocol: overrides.protocol ?? "custom",
      goal_focus: overrides.goalFocus ?? "strength",
    },
  }) as unknown as ActiveMesocycleProgram;

const workoutToday = (createdAt: string): RecentWorkoutSummary =>
  ({
    workout_created_at: createdAt,
    exercise_names: ["Bench Press"],
    duration_seconds: 1800,
  }) as unknown as RecentWorkoutSummary;

describe("displayName fallback chain", () => {
  it("profile username wins over metadata and email", () => {
    const model = buildHomeModel({
      ...baseInputs,
      profile: { username: "hank" } as never,
      userMetadataName: "Henry Svensson",
      userEmail: "h@x.com",
    });
    expect(model.displayName).toBe("hank");
  });

  it("falls back to first word of metadata name, then email prefix, then Athlete", () => {
    expect(
      buildHomeModel({ ...baseInputs, userMetadataName: "Henry Svensson" })
        .displayName
    ).toBe("Henry");
    expect(
      buildHomeModel({ ...baseInputs, userEmail: "hank.s@example.com" })
        .displayName
    ).toBe("hank.s");
    expect(buildHomeModel(baseInputs).displayName).toBe("Athlete");
  });
});

describe("today's session card", () => {
  it("keeps a meaningful session name but replaces generic ones with an inferred label", () => {
    const named = buildHomeModel({
      ...baseInputs,
      activeProgram: program({
        sessions: [
          {
            id: "s1",
            name: "Push Day",
            exercises: [{ exercise: { name: "Bench Press" } }],
          },
        ],
      }),
    });
    expect(named.todayWorkoutTitle).toBe("Push Day");

    const generic = buildHomeModel({
      ...baseInputs,
      activeProgram: program({
        sessions: [
          {
            id: "s1",
            name: "Workout A", // generic pattern -> infer from exercises
            exercises: [
              { exercise: { name: "Squat" } },
              { exercise: { name: "Barbell Row" } },
            ],
          },
        ],
      }),
    });
    expect(generic.todayWorkoutTitle).toBe("Full Body");
  });

  it("without a program: default title and 'Ready when you are'", () => {
    const model = buildHomeModel(baseInputs);
    expect(model.todayWorkoutTitle).toBe("Today's Session");
    expect(model.todayWorkoutDetail).toBe("Ready when you are");
  });

  it("picks the next_session_id session, skipping sessions with no exercises", () => {
    const model = buildHomeModel({
      ...baseInputs,
      activeProgram: program({
        sessions: [
          { id: "empty", name: "Rest", exercises: [] },
          {
            id: "s2",
            name: "Pull Day",
            exercises: [{ exercise: { name: "Pull Up" } }],
          },
        ],
        nextSessionId: "empty", // unstartable -> falls back to first startable
      }),
    });
    expect(model.nextSession?.id).toBe("s2");
  });
});

describe("movement, streaks, and habit items", () => {
  const habits = [
    habit("h-move", "Movement"),
    habit("h-med", "Meditation"),
    habit("h-write", "Writing"),
  ];

  it("a workout logged today counts as movement done even with no completion record", () => {
    const model = buildHomeModel({
      ...baseInputs,
      habits,
      recentWorkouts: [workoutToday(`${TODAY}T08:00:00`)],
    });
    expect(model.workoutLoggedToday).toBe(true);
    expect(model.habitItems.find(item => item.label === "Movement")?.done).toBe(
      true
    );
  });

  it("streak counts consecutive days ending today; label reflects zero state", () => {
    const streaky = buildHomeModel({
      ...baseInputs,
      habits,
      movementCompletionDates: ["2026-07-01", "2026-06-30"],
      recentWorkouts: [workoutToday(`${TODAY}T08:00:00`)], // today via workout
    });
    expect(streaky.movementStreakLabel).toBe("3-day streak");

    expect(buildHomeModel({ ...baseInputs, habits }).movementStreakLabel).toBe(
      "Start your streak today"
    );
  });

  it("habit items disable while completions load or a toggle is pending", () => {
    const model = buildHomeModel({
      ...baseInputs,
      habits,
      pendingIds: { "h-med": true },
    });
    expect(model.habitItems.find(item => item.label === "Meditation")?.disabled).toBe(true);
    expect(model.habitItems.find(item => item.label === "Movement")?.disabled).toBe(false);
    // A missing habit is always disabled.
    const noHabits = buildHomeModel(baseInputs);
    expect(noHabits.habitItems.every(item => item.disabled)).toBe(true);
  });
});

describe("session action", () => {
  it("offers Resume when a workout was started today, Begin otherwise", () => {
    const resumed = buildHomeModel({
      ...baseInputs,
      currentWorkout: { date: `${TODAY}T07:00:00` } as unknown as Workout,
    });
    expect(resumed.sessionActionLabel).toBe("Resume Session");
    expect(buildHomeModel(baseInputs).sessionActionLabel).toBe("Begin Session");
  });
});
