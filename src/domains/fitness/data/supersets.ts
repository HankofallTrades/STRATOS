import type { WorkoutExercise } from "@/lib/types/workout";

/** A valid pair is adjacent; legacy or incomplete membership stays ungrouped. */
export const workoutExerciseGroups = (exercises: WorkoutExercise[]): WorkoutExercise[][] => {
  const groups: WorkoutExercise[][] = [];
  for (let index = 0; index < exercises.length; index++) {
    const first = exercises[index];
    const second = exercises[index + 1];
    if (first.supersetId && second?.supersetId === first.supersetId) {
      groups.push([first, second]);
      index++;
    } else {
      groups.push([first]);
    }
  }
  return groups;
};

/** Completion can arrive out of order or from the Activity Journal. */
export const startsRestAfterSet = (
  exercises: WorkoutExercise[],
  workoutExerciseId: string,
  setId: string
): boolean => {
  const group = workoutExerciseGroups(exercises).find(members =>
    members.some(member => member.id === workoutExerciseId)
  );
  const exercise = group?.find(member => member.id === workoutExerciseId);
  const round = exercise?.sets.findIndex(set => set.id === setId) ?? -1;
  if (!group || round < 0) return false;
  return group.every(member => member.id === workoutExerciseId || member.sets[round]?.completed);
};
