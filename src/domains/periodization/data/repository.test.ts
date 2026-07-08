import { describe, expect, it, vi } from "vitest";

const mutationCalls: string[] = [];
let mesocycleSessionRows: unknown[] = [];
let sessionExerciseRows: unknown[] = [];

const activeMesocycle = {
  id: "meso-1",
  user_id: "user-1",
  name: "Mixed Block",
  goal_focus: "mixed",
  protocol: "custom",
  start_date: "2026-06-01",
  duration_weeks: 8,
  status: "active",
  notes: null,
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z",
};

vi.mock("@/lib/integrations/supabase/client", () => {
  const makeQuery = (table: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      not: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(() => {
        if (table === "mesocycle_sessions") {
          return Promise.resolve({ data: mesocycleSessionRows, error: null });
        }
        if (table === "mesocycle_session_exercises") {
          return Promise.resolve({ data: sessionExerciseRows, error: null });
        }
        return query;
      }),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(() => {
        if (table === "mesocycles") {
          return Promise.resolve({ data: activeMesocycle, error: null });
        }
        if (table === "workouts") {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      insert: vi.fn(() => {
        mutationCalls.push(`${table}:insert`);
        return {
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: "inserted-session" },
                error: null,
              }),
          }),
        };
      }),
      update: vi.fn(() => {
        mutationCalls.push(`${table}:update`);
        return {
          eq: () => Promise.resolve({ error: null }),
        };
      }),
      delete: vi.fn(() => {
        mutationCalls.push(`${table}:delete`);
        return {
          eq: () => Promise.resolve({ error: null }),
        };
      }),
    };

    return query;
  };

  return {
    supabase: {
      from: vi.fn(makeQuery),
    },
  };
});

describe("getActiveMesocycleProgram", () => {
  it("reads an active template program without repairing it during page load", async () => {
    mutationCalls.length = 0;
    mesocycleSessionRows = [];
    sessionExerciseRows = [];
    const { getActiveMesocycleProgram } = await import(
      "@/domains/periodization/data/repository"
    );

    await expect(getActiveMesocycleProgram("user-1")).resolves.toMatchObject({
      mesocycle: activeMesocycle,
      sessions: [],
    });
    expect(mutationCalls).toEqual([]);
  });
});

describe("fetchActiveMesocycleSummary", () => {
  it("returns a next-session summary without mutating template sessions", async () => {
    mutationCalls.length = 0;
    mesocycleSessionRows = [
      {
        id: "session-1",
        mesocycle_id: "meso-1",
        name: "Workout A",
        session_order: 1,
        session_focus: "mixed",
      },
    ];
    sessionExerciseRows = [
      { exercises: { name: "Squat" } },
      { exercises: { name: "Barbell Row" } },
    ];
    const { fetchActiveMesocycleSummary } = await import(
      "@/domains/periodization/data/repository"
    );

    await expect(fetchActiveMesocycleSummary("user-1")).resolves.toMatchObject({
      next_session_exercise_count: 2,
      next_session_exercise_names: ["Squat", "Barbell Row"],
      next_session_id: "session-1",
      next_session_name: "Workout A",
    });
    expect(mutationCalls).toEqual([]);
  });
});
