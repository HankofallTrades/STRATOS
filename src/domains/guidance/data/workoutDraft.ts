import { v4 as uuidv4 } from "uuid";

import type {
  Exercise,
  ExerciseSet,
  WorkoutExercise,
} from "@/lib/types/workout";

export const buildExerciseDraft = (exercise: Exercise): WorkoutExercise => {
  const defaultEquipment = exercise.default_equipment_type ?? undefined;
  const defaultVariation = "Standard";
  const defaultSet: ExerciseSet = {
    completed: false,
    equipmentType: defaultEquipment,
    exerciseId: exercise.id,
    id: uuidv4(),
    reps: 0,
    variation: defaultVariation,
    weight: 0,
  };

  return {
    equipmentType: defaultEquipment,
    exercise: { ...exercise },
    exerciseId: exercise.id,
    id: uuidv4(),
    sets: [defaultSet],
    variation: defaultVariation,
  };
};
