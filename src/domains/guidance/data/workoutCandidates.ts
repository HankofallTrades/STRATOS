import type { Exercise } from "@/lib/types/workout";

// Pure candidate filtering for workout generation. Equipment uses
// OR-semantics against exercises.compatible_equipment; injury avoidance
// only excludes exercises whose PRIMARY muscles are flagged so
// complementary/supporting work stays available. No React, no Supabase.

export interface CandidateConstraints {
  availableEquipment?: string[] | null;
  avoidMuscles?: string[] | null;
}

const normalize = (value: string) => value.trim().toLowerCase();

const matchesEquipment = (
  exercise: Exercise,
  availableEquipment: string[]
): boolean => {
  const compatible = exercise.compatible_equipment ?? [];
  if (compatible.length === 0) {
    // Unknown equipment data (e.g. legacy user-created rows) stays eligible.
    return true;
  }
  const available = new Set(availableEquipment.map(normalize));
  return compatible.some((name) => available.has(normalize(name)));
};

const avoidsPrimaryMuscle = (
  exercise: Exercise,
  avoidMuscles: string[],
  primaryMuscleMap: Record<string, string[]>
): boolean => {
  const primaries = primaryMuscleMap[exercise.id];
  if (!primaries || primaries.length === 0) {
    return false;
  }
  const avoided = new Set(avoidMuscles.map(normalize));
  return primaries.some((muscle) => avoided.has(normalize(muscle)));
};

export const filterCandidateExercises = (
  exercises: Exercise[],
  constraints: CandidateConstraints,
  primaryMuscleMap: Record<string, string[]>
): Exercise[] => {
  const availableEquipment = constraints.availableEquipment ?? [];
  const avoidMuscles = constraints.avoidMuscles ?? [];

  return exercises.filter((exercise) => {
    if (
      availableEquipment.length > 0 &&
      !matchesEquipment(exercise, availableEquipment)
    ) {
      return false;
    }
    if (
      avoidMuscles.length > 0 &&
      avoidsPrimaryMuscle(exercise, avoidMuscles, primaryMuscleMap)
    ) {
      return false;
    }
    return true;
  });
};

const shuffle = <T,>(values: T[]): T[] => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

export const selectRecoveryExercises = (
  exercises: Exercise[],
  count: number,
  constraints: CandidateConstraints,
  primaryMuscleMap: Record<string, string[]>
): Exercise[] => {
  const eligible = filterCandidateExercises(
    exercises.filter(
      (exercise) =>
        exercise.exercise_category === "mobility" ||
        exercise.exercise_category === "stability"
    ),
    constraints,
    primaryMuscleMap
  );

  const mobility = shuffle(
    eligible.filter((exercise) => exercise.exercise_category === "mobility")
  );
  const stability = shuffle(
    eligible.filter((exercise) => exercise.exercise_category === "stability")
  );

  // Alternate mobility/stability for a balanced recovery session, then fill
  // from whichever category still has entries.
  const selected: Exercise[] = [];
  while (
    selected.length < count &&
    (mobility.length > 0 || stability.length > 0)
  ) {
    const preferMobility = selected.length % 2 === 0;
    const next =
      (preferMobility ? mobility.shift() : stability.shift()) ??
      mobility.shift() ??
      stability.shift();
    if (!next) break;
    selected.push(next);
  }
  return selected;
};
