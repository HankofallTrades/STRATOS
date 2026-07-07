import { describe, expect, it } from "vitest";

import {
  buildActiveWorkoutEdit,
  buildProgramContextMessage,
  buildProgramDraft,
  buildProgramEdit,
  formatCatalogByArchetype,
} from "./toolBuilders";
import type {
  ProposeActiveWorkoutEditInput,
  ProposeProgramEditInput,
  ProposeProgramInput,
} from "@/domains/guidance/agent/tools";
import type { ActiveMesocycleProgram } from "@/domains/periodization";
import type { Exercise, Workout } from "@/lib/types/workout";

// The Coach must address exercises by their exact catalog name; these builders
// resolve model-supplied names against the catalog and BOUNCE unresolved names
// back as thrown errors so the model can self-correct. The tests below encode
// that contract (resolve, or fail loud with the catalog listed), not just the
// happy-path shape.

const exercise = (
  id: string,
  name: string,
  archetype_id: string | null,
  exercise_type: string = "strength"
): Exercise =>
  ({
    id,
    name,
    archetype_id,
    exercise_type,
    default_equipment_type: "barbell",
  } as unknown as Exercise);

const CATALOG: Exercise[] = [
  exercise("ex-squat", "Back Squat", "arch-squat"),
  exercise("ex-bench", "Bench Press", "arch-push"),
  exercise("ex-row", "Barbell Row", "arch-pull"),
];

const ARCHETYPE_MAP = new Map<string, string>([
  ["arch-squat", "squat"],
  ["arch-push", "push_horizontal"],
  ["arch-pull", "pull_horizontal"],
]);

const program = (protocol: string): ActiveMesocycleProgram =>
  ({
    current_week: 2,
    next_session_name: "Workout A",
    mesocycle: {
      id: "meso-1",
      name: "Summer Strength",
      protocol,
      duration_weeks: 6,
      goal_focus: "strength",
    },
    sessions: [
      {
        id: "session-a",
        name: "Workout A",
        exercises: [
          {
            id: "row-1",
            exercise: { name: "Back Squat" },
            target_sets: 3,
            target_reps: "5",
          },
        ],
      },
    ],
  } as unknown as ActiveMesocycleProgram);

const workout = (): Workout =>
  ({
    id: "workout-1",
    exercises: [
      { id: "we-1", exercise: { name: "Bench Press" } },
    ],
  } as unknown as Workout);

describe("buildProgramContextMessage", () => {
  it("lists the active program and the catalog so the model uses exact names", () => {
    const { message } = buildProgramContextMessage({
      catalog: CATALOG,
      archetypeMap: ARCHETYPE_MAP,
      program: program("coach"),
    });
    expect(message).toContain('Active program: "Summer Strength"');
    expect(message).toContain("use these exact names");
    expect(message).toContain("Back Squat");
  });

  it("says there is no active program when none is supplied", () => {
    const { message } = buildProgramContextMessage({
      catalog: CATALOG,
      archetypeMap: ARCHETYPE_MAP,
      program: null,
    });
    expect(message).toContain("No active program.");
  });
});

describe("buildProgramDraft", () => {
  const input: ProposeProgramInput = {
    name: "Block 1",
    goalFocus: "strength",
    durationWeeks: 6,
    rationale: "Build a base.",
    sessions: [
      {
        name: "Day 1",
        exercises: [{ exerciseName: "Back Squat", targetSets: 3, targetReps: "5" }],
      },
    ],
  } as ProposeProgramInput;

  it("resolves catalog names into a drafted program artifact", () => {
    const result = buildProgramDraft(input, {
      catalog: CATALOG,
      archetypeMap: ARCHETYPE_MAP,
    });
    expect(result.artifact?.type).toBe("program_draft");
    const drafted = (result.artifact as { apply: { draftedProgram: { sessions: Array<{ exercises: Array<{ exerciseId: string }> }> } } })
      .apply.draftedProgram;
    // The resolved id (not the model-supplied name) is what gets persisted.
    expect(drafted.sessions[0].exercises[0].exerciseId).toBe("ex-squat");
  });

  it("throws with the catalog listed when a name is not in the catalog", () => {
    const bad = {
      ...input,
      sessions: [
        { name: "Day 1", exercises: [{ exerciseName: "Hack Squat" }] },
      ],
    } as ProposeProgramInput;
    expect(() =>
      buildProgramDraft(bad, { catalog: CATALOG, archetypeMap: ARCHETYPE_MAP })
    ).toThrow(/not in the catalog: Hack Squat/);
  });
});

describe("buildProgramEdit", () => {
  it("flags that editing a non-coach program converts it to coach-managed", () => {
    const input: ProposeProgramEditInput = {
      rationale: "Swap for variety.",
      ops: [
        {
          op: "replace_exercise",
          sessionName: "Workout A",
          exerciseName: "Back Squat",
          newExerciseName: "Bench Press",
        },
      ],
    } as ProposeProgramEditInput;
    const result = buildProgramEdit(input, {
      catalog: CATALOG,
      archetypeMap: ARCHETYPE_MAP,
      program: program("occams"),
    });
    const artifact = result.artifact as { convertsToCoachProtocol: boolean };
    expect(artifact.convertsToCoachProtocol).toBe(true);
    expect(result.message).toContain("converts the program to coach-managed");
  });

  it("does not flag conversion when the program is already coach-managed", () => {
    const input: ProposeProgramEditInput = {
      rationale: "Tune targets.",
      ops: [
        {
          op: "update_targets",
          sessionName: "Workout A",
          exerciseName: "Back Squat",
          targetSets: 4,
        },
      ],
    } as ProposeProgramEditInput;
    const result = buildProgramEdit(input, {
      catalog: CATALOG,
      archetypeMap: ARCHETYPE_MAP,
      program: program("coach"),
    });
    expect((result.artifact as { convertsToCoachProtocol: boolean }).convertsToCoachProtocol).toBe(false);
  });

  it("throws when there is no active program to edit", () => {
    const input = { rationale: "x", ops: [{ op: "remove_exercise", sessionName: "A", exerciseName: "B" }] } as ProposeProgramEditInput;
    expect(() =>
      buildProgramEdit(input, { catalog: CATALOG, archetypeMap: ARCHETYPE_MAP, program: null })
    ).toThrow(/no active program/);
  });

  it("throws when the named exercise is not in the named session", () => {
    const input = {
      rationale: "x",
      ops: [{ op: "remove_exercise", sessionName: "Workout A", exerciseName: "Bench Press" }],
    } as ProposeProgramEditInput;
    expect(() =>
      buildProgramEdit(input, { catalog: CATALOG, archetypeMap: ARCHETYPE_MAP, program: program("coach") })
    ).toThrow(/is not in session "Workout A"/);
  });
});

describe("buildActiveWorkoutEdit", () => {
  it("produces an edit with an inverse action so it can be reverted later", () => {
    const input: ProposeActiveWorkoutEditInput = {
      rationale: "Shoulder is cranky.",
      ops: [
        {
          op: "swap_exercise",
          exerciseName: "Bench Press",
          newExerciseName: "Barbell Row",
        },
      ],
    } as ProposeActiveWorkoutEditInput;
    const result = buildActiveWorkoutEdit(input, {
      catalog: CATALOG,
      archetypeMap: ARCHETYPE_MAP,
      currentWorkout: workout(),
    });
    const apply = (result.artifact as { apply: { actions: unknown[]; inverseActions: unknown[] } }).apply;
    expect(apply.actions).toHaveLength(1);
    // The inverse must exist for one-tap revert from the change log.
    expect(apply.inverseActions).toHaveLength(1);
  });

  it("throws when there is no workout in progress", () => {
    const input = { rationale: "x", ops: [{ op: "remove_exercise", exerciseName: "Bench Press" }] } as ProposeActiveWorkoutEditInput;
    expect(() =>
      buildActiveWorkoutEdit(input, { catalog: CATALOG, archetypeMap: ARCHETYPE_MAP, currentWorkout: null })
    ).toThrow(/no workout in progress/);
  });
});

describe("formatCatalogByArchetype", () => {
  it("groups archetype-less mobility and stability exercises by category", () => {
    const catalog: Exercise[] = [
      { id: "1", name: "Plank", exercise_type: "strength", exercise_category: "stability", archetype_id: null },
      { id: "2", name: "Pigeon Pose", exercise_type: "strength", exercise_category: "mobility", archetype_id: null },
    ];
    const formatted = formatCatalogByArchetype(catalog, new Map());
    expect(formatted).toContain("Mobility: Pigeon Pose");
    expect(formatted).toContain("Stability: Plank");
  });
});
