import { describe, expect, it } from "vitest";

import type { Exercise } from "@/lib/types/workout";
import {
  computeCurrentWeek,
  customProtocolTemplate,
  customSessionExerciseRows,
  getNextSessionInRotation,
  HYPERTROPHY_TEMPLATE,
  OCCAMS_TEMPLATE,
  occamsSessionExerciseRows,
  STRENGTH_TEMPLATE,
  templateSessionRow,
} from "./programProtocol";

const session = (id: string) => ({ id });
const rotation = [session("a"), session("b"), session("c")];

describe("getNextSessionInRotation", () => {
  it("starts a program on its first session when nothing has been completed", () => {
    expect(getNextSessionInRotation(rotation, null)).toBe(rotation[0]);
  });

  it("moves to the session after the last completed one", () => {
    expect(getNextSessionInRotation(rotation, "a")).toBe(rotation[1]);
  });

  it("wraps from the last session back to the first", () => {
    expect(getNextSessionInRotation(rotation, "c")).toBe(rotation[0]);
  });

  // The last completed session can be one the program no longer holds (a Coach
  // edit replaced it, say). Starting over beats refusing to suggest anything.
  it("restarts the rotation when the last completed session is no longer in the program", () => {
    expect(getNextSessionInRotation(rotation, "gone")).toBe(rotation[0]);
  });

  it("has nothing to suggest for a program without sessions", () => {
    expect(getNextSessionInRotation([], "a")).toBeNull();
  });
});

describe("computeCurrentWeek", () => {
  const start = "2026-06-01";

  it("counts a block that has not started yet as week 1", () => {
    expect(computeCurrentWeek(start, 8, new Date("2026-05-20T12:00:00Z"))).toBe(1);
  });

  it("is week 1 on the start date", () => {
    expect(computeCurrentWeek(start, 8, new Date("2026-06-01T12:00:00Z"))).toBe(1);
  });

  it("turns over to the next week seven days after the start", () => {
    expect(computeCurrentWeek(start, 8, new Date("2026-06-07T23:00:00Z"))).toBe(1);
    expect(computeCurrentWeek(start, 8, new Date("2026-06-08T00:00:00Z"))).toBe(2);
  });

  it("finds the week mid-block", () => {
    expect(computeCurrentWeek(start, 8, new Date("2026-06-24T09:00:00Z"))).toBe(4);
  });

  it("stays on the final week once the block has run past its end", () => {
    expect(computeCurrentWeek(start, 8, new Date("2026-09-25T09:00:00Z"))).toBe(8);
  });
});

describe("customProtocolTemplate", () => {
  it("gives a strength block the strength sessions", () => {
    expect(customProtocolTemplate("strength")).toBe(STRENGTH_TEMPLATE);
  });

  it("gives every other focus the hypertrophy sessions", () => {
    expect(customProtocolTemplate("hypertrophy")).toBe(HYPERTROPHY_TEMPLATE);
    expect(customProtocolTemplate("mixed")).toBe(HYPERTROPHY_TEMPLATE);
  });
});

describe("templateSessionRow", () => {
  it("places a template session in its block at the given order", () => {
    expect(templateSessionRow("meso-1", 2, STRENGTH_TEMPLATE[1])).toEqual({
      mesocycle_id: "meso-1",
      name: "Workout B",
      session_order: 2,
      session_focus: "strength",
      sets_per_exercise: 3,
      rep_range: "3-5",
      progression_rule:
        "Hold load until all primary sets reach top reps, then increase next exposure.",
    });
  });
});

const exercise = (id: string, name: string) => ({ id, name }) as Exercise;

describe("customSessionExerciseRows", () => {
  const catalog = [
    exercise("ex-back-squat", "Back Squat"),
    exercise("ex-bench", "Bench Press"),
    exercise("ex-row", "Row"),
    exercise("ex-split", "  bulgarian split squat "),
    exercise("ex-chop", "Wood Chop"),
  ];

  it("resolves each exercise to the first candidate name the catalog holds, ignoring case and padding", () => {
    const rows = customSessionExerciseRows("session-1", STRENGTH_TEMPLATE[2], catalog);
    expect(rows.map(row => row.exercise_id)).toEqual(["ex-split", "ex-bench", "ex-chop"]);
  });

  it("carries the template's targets onto rows in template order", () => {
    const [first] = customSessionExerciseRows("session-1", STRENGTH_TEMPLATE[0], catalog);
    expect(first).toEqual({
      mesocycle_session_id: "session-1",
      exercise_id: "ex-back-squat",
      exercise_order: 1,
      target_sets: 3,
      target_reps: "3-5",
      load_increment_kg: 2.5,
      notes: "Primary lower-body strength lift.",
    });
  });

  // The workout screen reads the preset line back out of notes to pre-select
  // equipment and variation, so it rides alongside any coaching note.
  it("appends the equipment and variation preset to the notes", () => {
    const rows = customSessionExerciseRows("session-1", STRENGTH_TEMPLATE[2], catalog);
    expect(rows[1].notes).toBe(
      'Secondary bench exposure.\n__preset__:{"equipmentType":"Barbell","variation":"Incline"}'
    );
    const hypertrophyRows = customSessionExerciseRows("session-1", HYPERTROPHY_TEMPLATE[2], catalog);
    expect(hypertrophyRows[1].notes).toBe(
      '__preset__:{"equipmentType":"Barbell","variation":"Incline"}'
    );
    expect(hypertrophyRows[0].notes).toBeNull();
  });

  it("refuses a template whose exercise the catalog lacks, naming what it looked for", () => {
    expect(() =>
      customSessionExerciseRows("session-1", STRENGTH_TEMPLATE[1], catalog)
    ).toThrow("Missing exercise for Workout B: Deadlift / Romanian Deadlift");
  });
});

describe("occamsSessionExerciseRows", () => {
  it("pairs each template exercise, in order, with the exercise resolved for it", () => {
    const rows = occamsSessionExerciseRows("session-1", OCCAMS_TEMPLATE[1], ["ex-bench", "ex-leg-press"]);
    expect(rows.map(row => [row.exercise_id, row.exercise_order])).toEqual([
      ["ex-bench", 1],
      ["ex-leg-press", 2],
    ]);
    expect(rows[1]).toMatchObject({
      mesocycle_session_id: "session-1",
      target_reps: OCCAMS_TEMPLATE[1].exercises[1].targetReps,
      load_increment_kg: OCCAMS_TEMPLATE[1].exercises[1].loadIncrementKg,
    });
  });

  // Occam's is prescribed down to the machine, so even "Standard" is recorded
  // where a custom template would leave the preset out.
  it("always records the equipment and variation preset, Standard included", () => {
    const [, legPress] = occamsSessionExerciseRows("session-1", OCCAMS_TEMPLATE[1], ["ex-bench", "ex-leg-press"]);
    expect(legPress.notes).toBe(
      `${OCCAMS_TEMPLATE[1].exercises[1].notes}\n__preset__:{"equipmentType":"Machine","variation":"Standard"}`
    );
  });
});
