import { v4 as uuidv4 } from "uuid";

import type { MesocycleProtocol, MesocycleSessionTemplate } from "@/domains/periodization";
import type {
  CardioSet,
  SessionFocus,
  StrengthSet,
  WorkoutExercise,
} from "@/lib/types/workout";
import { isCardioExercise, secondsToTime } from "@/lib/types/workout";

export const sessionFocusOptions: SessionFocus[] = [
  "hypertrophy",
  "strength",
  "zone2",
  "zone5",
  "speed",
  "recovery",
  "mixed",
];

export const formatSessionFocusLabel = (focus: SessionFocus) => {
  const labels: Record<SessionFocus, string> = {
    hypertrophy: "Hypertrophy",
    strength: "Strength",
    zone2: "Zone 2",
    zone5: "Zone 5",
    speed: "Speed",
    recovery: "Recovery",
    mixed: "Mixed",
  };
  return labels[focus];
};

export const formatProtocolLabel = (protocol: MesocycleProtocol) => {
  return protocol === "occams" ? "Occam's" : "Custom";
};

export const getOccamsExercisePrescription = (
  exerciseName: string
): { equipmentType: string; variation: string } | null => {
  const normalized = exerciseName.trim().toLowerCase();

  if (
    normalized === "pulldown" ||
    normalized === "close-grip supinated pulldown"
  ) {
    return { equipmentType: "Machine", variation: "Supinated" };
  }

  if (
    normalized === "shoulder press" ||
    normalized === "machine shoulder press" ||
    normalized === "leg press"
  ) {
    return { equipmentType: "Machine", variation: "Standard" };
  }

  if (
    normalized === "chest press" ||
    normalized === "slight incline chest press"
  ) {
    return { equipmentType: "Machine", variation: "Incline" };
  }

  return null;
};

export const buildExercisesFromSessionTemplate = (
  sessionTemplate: MesocycleSessionTemplate
): WorkoutExercise[] => {
  return sessionTemplate.exercises
    .filter(row => !!row.exercise)
    .map(row => {
      const exercise = row.exercise!;
      const setCount = row.target_sets ?? sessionTemplate.sets_per_exercise ?? 2;
      const occamsPrescription = getOccamsExercisePrescription(exercise.name);
      const targetEquipmentType =
        occamsPrescription?.equipmentType ??
        exercise.default_equipment_type ??
        "Machine";
      const targetVariation = occamsPrescription?.variation ?? "Standard";

      if (isCardioExercise(exercise)) {
        const cardioSets: CardioSet[] = Array.from({ length: setCount }, () => ({
          id: uuidv4(),
          exerciseId: exercise.id,
          time: secondsToTime(300),
          completed: false,
        }));

        return {
          id: uuidv4(),
          exerciseId: exercise.id,
          exercise,
          sets: cardioSets,
        };
      }

      const strengthSets: StrengthSet[] = Array.from(
        { length: setCount },
        () => ({
          id: uuidv4(),
          exerciseId: exercise.id,
          weight: 0,
          reps: exercise.is_static ? null : 0,
          time: exercise.is_static ? secondsToTime(30) : null,
          completed: false,
          variation: targetVariation,
          equipmentType: targetEquipmentType,
        })
      );

      return {
        id: uuidv4(),
        exerciseId: exercise.id,
        exercise,
        equipmentType: targetEquipmentType,
        variation: targetVariation,
        sets: strengthSets,
      };
    });
};

export const getFocusDisplayInfo = (focus: SessionFocus) => {
  const focusMap = {
    strength: {
      title: "Strength",
      color: "verdigris-text",
    },
    hypertrophy: {
      title: "Hypertrophy",
      color: "verdigris-text",
    },
    zone2: {
      title: "Endurance",
      color: "verdigris-text",
    },
    zone5: {
      title: "Max HR",
      color: "verdigris-text",
    },
    speed: {
      title: "Speed & Power",
      color: "verdigris-text",
    },
    recovery: {
      title: "Recovery",
      color: "verdigris-text",
    },
    mixed: {
      title: "Mixed",
      color: "verdigris-text",
    },
  };

  return focusMap[focus] || { title: focus, color: "verdigris-text" };
};
