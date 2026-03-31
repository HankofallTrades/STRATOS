import { differenceInDays, startOfDay } from "date-fns";
import { useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

import type { DisplayArchetypeData } from "@/domains/analytics/hooks/useVolumeChart";
import { buildExercisesFromSessionTemplate } from "@/domains/fitness/data/workoutScreen";
import type {
  ActiveMesocycleProgram,
  MesocycleSessionTemplate,
} from "@/domains/periodization";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import type {
  Exercise,
  ExerciseSet,
  SessionFocus,
  Workout,
  WorkoutExercise,
} from "@/lib/types/workout";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectWorkoutHistory } from "@/state/history/historySlice";
import { startWorkout } from "@/state/workout/workoutSlice";

const ARCHETYPE_TARGETS: Record<string, number> = {
  bend: 7,
  lunge: 7,
  pull_horizontal: 5,
  pull_vertical: 5,
  push_horizontal: 5,
  push_vertical: 5,
  squat: 7,
  twist: 7,
};

const ARCHETYPE_LABELS: Record<string, string> = {
  bend: "Bend",
  lunge: "Lunge",
  pull_horizontal: "Horizontal Pull",
  pull_vertical: "Vertical Pull",
  push_horizontal: "Horizontal Push",
  push_vertical: "Vertical Push",
  squat: "Squat",
  twist: "Twist",
};

const DEFAULT_EXERCISE_COUNT_BY_FOCUS: Record<SessionFocus, number> = {
  hypertrophy: 5,
  mixed: 5,
  recovery: 3,
  speed: 4,
  strength: 4,
  zone2: 3,
  zone5: 3,
};

interface ArchetypeDeficit {
  currentSets: number;
  deficit: number;
  goalSets: number;
  label: string;
  name: string;
}

interface WorkoutGeneratorPlanningContext {
  activeProgram?: ActiveMesocycleProgram | null;
  volumeProgress?: DisplayArchetypeData[];
}

export interface GeneratedWorkoutSummary {
  message: string;
  mesocycle?: {
    currentWeek: number;
    name: string;
    protocol: "occams" | "custom";
    sessionName?: string;
  };
  selectedExercises: string[];
  sessionFocus: SessionFocus;
  source: "hybrid" | "periodized_template" | "volume_deficit";
  targetedArchetypes: string[];
  volumeFocus: Array<{
    archetype: string;
    currentSets: number;
    deficit: number;
    goalSets: number;
  }>;
}

const getArchetypeName = (
  exercise: Exercise,
  archetypeMap: Map<string, string>
): string | undefined => {
  if (!exercise.archetype_id) {
    return undefined;
  }

  return archetypeMap.get(exercise.archetype_id)?.toLowerCase();
};

const createArchetypeDeficit = (
  name: string,
  currentSets: number,
  goalSets: number
): ArchetypeDeficit => ({
  currentSets,
  deficit: Math.max(0, goalSets - currentSets),
  goalSets,
  label: ARCHETYPE_LABELS[name] ?? name,
  name,
});

const calculateWeeklySetsPerArchetype = (
  workoutHistory: Workout[],
  exerciseMap: Map<string, Exercise>,
  archetypeMap: Map<string, string>
): Record<string, number> => {
  const weeklySets: Record<string, number> = {};
  const today = startOfDay(new Date());

  workoutHistory.forEach(workout => {
    const workoutDate = startOfDay(new Date(workout.date));
    if (differenceInDays(today, workoutDate) >= 7) {
      return;
    }

    workout.exercises.forEach(workoutExercise => {
      const completedSets = workoutExercise.sets.filter(set => set.completed);
      if (completedSets.length === 0) {
        return;
      }

      const exerciseDetails = exerciseMap.get(workoutExercise.exerciseId);
      if (!exerciseDetails) {
        return;
      }

      const archetype = getArchetypeName(exerciseDetails, archetypeMap);
      if (!archetype) {
        return;
      }

      weeklySets[archetype] = (weeklySets[archetype] || 0) + completedSets.length;
    });
  });

  return weeklySets;
};

const sortDeficits = (deficits: ArchetypeDeficit[]) =>
  deficits
    .filter(deficit => deficit.deficit > 0)
    .sort((left, right) => {
      if (right.deficit !== left.deficit) {
        return right.deficit - left.deficit;
      }

      return left.currentSets - right.currentSets;
    });

const buildDeficitsFromWeeklySets = (
  weeklySets: Record<string, number>
): ArchetypeDeficit[] =>
  sortDeficits(
    Object.entries(ARCHETYPE_TARGETS).map(([name, goalSets]) =>
      createArchetypeDeficit(name, weeklySets[name] || 0, goalSets)
    )
  );

const buildDeficitsFromProgressData = (
  volumeProgress: DisplayArchetypeData[]
): ArchetypeDeficit[] =>
  sortDeficits(
    volumeProgress.flatMap(archetype => {
      switch (archetype.name) {
        case "Push":
          return [
            createArchetypeDeficit(
              "push_vertical",
              archetype.verticalSets,
              ARCHETYPE_TARGETS.push_vertical
            ),
            createArchetypeDeficit(
              "push_horizontal",
              archetype.horizontalSets,
              ARCHETYPE_TARGETS.push_horizontal
            ),
          ];
        case "Pull":
          return [
            createArchetypeDeficit(
              "pull_vertical",
              archetype.verticalSets,
              ARCHETYPE_TARGETS.pull_vertical
            ),
            createArchetypeDeficit(
              "pull_horizontal",
              archetype.horizontalSets,
              ARCHETYPE_TARGETS.pull_horizontal
            ),
          ];
        case "Squat":
          return [
            createArchetypeDeficit(
              "squat",
              archetype.totalSets,
              ARCHETYPE_TARGETS.squat
            ),
          ];
        case "Lunge":
          return [
            createArchetypeDeficit(
              "lunge",
              archetype.totalSets,
              ARCHETYPE_TARGETS.lunge
            ),
          ];
        case "Bend":
          return [
            createArchetypeDeficit(
              "bend",
              archetype.totalSets,
              ARCHETYPE_TARGETS.bend
            ),
          ];
        case "Twist":
          return [
            createArchetypeDeficit(
              "twist",
              archetype.totalSets,
              ARCHETYPE_TARGETS.twist
            ),
          ];
        default:
          return [];
      }
    })
  );

const findLatestWorkout = (workoutHistory: Workout[]) => {
  if (workoutHistory.length === 0) {
    return null;
  }

  return workoutHistory.reduce<Workout | null>((latestWorkout, workout) => {
    if (!latestWorkout) {
      return workout;
    }

    const latestDate = startOfDay(new Date(latestWorkout.date));
    const currentDate = startOfDay(new Date(workout.date));
    return currentDate > latestDate ? workout : latestWorkout;
  }, null);
};

const resolveRecencyConstraints = (workoutHistory: Workout[]) => {
  const latestWorkout = findLatestWorkout(workoutHistory);
  if (!latestWorkout) {
    return {
      excludeExerciseIds: [] as string[],
      recommendedMaxExercises: Number.POSITIVE_INFINITY,
    };
  }

  const latestWorkoutDate = startOfDay(new Date(latestWorkout.date));
  const today = startOfDay(new Date());
  const daysSinceLastWorkout = differenceInDays(today, latestWorkoutDate);
  const excludeExerciseIds = latestWorkout.exercises.map(exercise => exercise.exerciseId);

  if (daysSinceLastWorkout <= 1) {
    return {
      excludeExerciseIds,
      recommendedMaxExercises: 3,
    };
  }

  if (daysSinceLastWorkout <= 3) {
    return {
      excludeExerciseIds,
      recommendedMaxExercises: 4,
    };
  }

  return {
    excludeExerciseIds: [] as string[],
    recommendedMaxExercises: Number.POSITIVE_INFINITY,
  };
};

const getNextSession = (
  activeProgram?: ActiveMesocycleProgram | null
): MesocycleSessionTemplate | null => {
  if (!activeProgram) {
    return null;
  }

  return (
    activeProgram.sessions.find(
      session => session.id === activeProgram.next_session_id
    ) ??
    activeProgram.sessions[0] ??
    null
  );
};

const normalizeStrengthSessionFocus = (
  focus?: SessionFocus | null
): SessionFocus => {
  if (focus === "hypertrophy" || focus === "mixed" || focus === "strength") {
    return focus;
  }

  return "strength";
};

const buildExerciseDraft = (exercise: Exercise): WorkoutExercise => {
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

const uniqueStrings = (values: Array<string | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const selectExercisesForWorkout = ({
  alreadyCoveredArchetypes,
  alreadySelectedExerciseIds,
  availableExercises,
  excludeExerciseIds,
  priorityTargets,
  targetExerciseCount,
  archetypeMap,
}: {
  alreadyCoveredArchetypes: Set<string>;
  alreadySelectedExerciseIds: Set<string>;
  availableExercises: Exercise[];
  excludeExerciseIds: string[];
  priorityTargets: ArchetypeDeficit[];
  targetExerciseCount: number;
  archetypeMap: Map<string, string>;
}) => {
  const selectedExercises: Exercise[] = [];

  for (const target of priorityTargets) {
    if (selectedExercises.length >= targetExerciseCount) {
      break;
    }

    if (alreadyCoveredArchetypes.has(target.name)) {
      continue;
    }

    const match = availableExercises.find(exercise => {
      if (
        alreadySelectedExerciseIds.has(exercise.id) ||
        excludeExerciseIds.includes(exercise.id)
      ) {
        return false;
      }

      return getArchetypeName(exercise, archetypeMap) === target.name;
    });

    if (!match) {
      continue;
    }

    selectedExercises.push(match);
    alreadySelectedExerciseIds.add(match.id);
    alreadyCoveredArchetypes.add(target.name);
  }

  if (selectedExercises.length >= targetExerciseCount) {
    return selectedExercises;
  }

  const fallbackExercises = availableExercises.filter(
    exercise =>
      !alreadySelectedExerciseIds.has(exercise.id) &&
      !excludeExerciseIds.includes(exercise.id)
  );

  const remainingCount = targetExerciseCount - selectedExercises.length;
  return [...selectedExercises, ...fallbackExercises.slice(0, remainingCount)];
};

const buildGeneratorMessage = ({
  activeProgram,
  nextSession,
  selectedExercises,
  sessionFocus,
  source,
  targetedArchetypes,
}: {
  activeProgram?: ActiveMesocycleProgram | null;
  nextSession?: MesocycleSessionTemplate | null;
  selectedExercises: string[];
  sessionFocus: SessionFocus;
  source: GeneratedWorkoutSummary["source"];
  targetedArchetypes: string[];
}) => {
  const focusLabel =
    sessionFocus.charAt(0).toUpperCase() + sessionFocus.slice(1).replace("2", " 2").replace("5", " 5");
  const mesocycleLabel = activeProgram
    ? ` for week ${activeProgram.current_week} of ${activeProgram.mesocycle.name}`
    : "";
  const sourceLabel =
    source === "periodized_template"
      ? ` using your programmed session${nextSession?.name ? ` (${nextSession.name})` : ""}`
      : source === "hybrid"
        ? " blending your programmed session with current volume gaps"
        : " from your current movement-archetype volume gaps";
  const archetypeLabel =
    targetedArchetypes.length > 0
      ? ` Prioritized ${targetedArchetypes.slice(0, 3).join(", ")}.`
      : "";
  const exerciseLabel =
    selectedExercises.length > 0
      ? ` Selected: ${selectedExercises.slice(0, 5).join(", ")}.`
      : "";

  return `Created a ${focusLabel.toLowerCase()} workout${mesocycleLabel}${sourceLabel}.${archetypeLabel}${exerciseLabel}`.trim();
};

export const useWorkoutGenerator = (
  baseExercises: Exercise[] | undefined,
  movementArchetypes: { id: string; name: string }[] | undefined,
  planningContext?: WorkoutGeneratorPlanningContext
) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const workoutHistory = useAppSelector(selectWorkoutHistory);

  const archetypeMap = useMemo(() => {
    if (!movementArchetypes) {
      return new Map<string, string>();
    }

    return new Map(movementArchetypes.map(archetype => [archetype.id, archetype.name]));
  }, [movementArchetypes]);

  const exercisesWithArchetypes = useMemo((): Exercise[] => {
    if (!baseExercises) {
      return [];
    }

    return baseExercises.filter(
      exercise => exercise.archetype_id && archetypeMap.has(exercise.archetype_id)
    );
  }, [baseExercises, archetypeMap]);

  const exerciseMap = useMemo(
    (): Map<string, Exercise> =>
      new Map(exercisesWithArchetypes.map(exercise => [exercise.id, exercise])),
    [exercisesWithArchetypes]
  );

  const generateWorkout = async (): Promise<GeneratedWorkoutSummary> => {
    if (exercisesWithArchetypes.length === 0) {
      throw new Error("Exercise data with archetypes is not available.");
    }

    const activeProgram = planningContext?.activeProgram ?? null;
    const nextSession = getNextSession(activeProgram);
    const sessionFocus = normalizeStrengthSessionFocus(
      nextSession?.session_focus ?? activeProgram?.mesocycle.goal_focus
    );
    const recencyConstraints = resolveRecencyConstraints(workoutHistory);
    const weeklySets = calculateWeeklySetsPerArchetype(
      workoutHistory,
      exerciseMap,
      archetypeMap
    );
    const priorityTargets =
      planningContext?.volumeProgress && planningContext.volumeProgress.length > 0
        ? buildDeficitsFromProgressData(planningContext.volumeProgress)
        : buildDeficitsFromWeeklySets(weeklySets);

    const templateExercises =
      nextSession?.exercises.some(
        sessionExercise =>
          sessionExercise.exercise &&
          sessionExercise.exercise.exercise_type !== "cardio"
      )
        ? (await buildExercisesFromSessionTemplate(nextSession, user?.id ?? "")).filter(
            exercise => exercise.exercise.exercise_type !== "cardio"
          )
        : [];

    const defaultExerciseCount =
      DEFAULT_EXERCISE_COUNT_BY_FOCUS[sessionFocus] ?? DEFAULT_EXERCISE_COUNT_BY_FOCUS.strength;
    const templateExerciseCount = templateExercises.length;

    const targetExerciseCount =
      activeProgram?.mesocycle.protocol === "occams" && templateExerciseCount > 0
        ? templateExerciseCount
        : Math.min(
            Math.max(
              templateExerciseCount,
              defaultExerciseCount
            ),
            Math.max(
              templateExerciseCount,
              Number.isFinite(recencyConstraints.recommendedMaxExercises)
                ? recencyConstraints.recommendedMaxExercises
                : defaultExerciseCount
            )
          );

    const selectedExerciseIds = new Set(
      templateExercises.map(exercise => exercise.exerciseId)
    );
    const coveredArchetypes = new Set(
      templateExercises
        .map(exercise => getArchetypeName(exercise.exercise, archetypeMap))
        .filter((value): value is string => Boolean(value))
    );

    const generatedExercises = selectExercisesForWorkout({
      alreadyCoveredArchetypes: coveredArchetypes,
      alreadySelectedExerciseIds: selectedExerciseIds,
      archetypeMap,
      availableExercises: exercisesWithArchetypes,
      excludeExerciseIds: recencyConstraints.excludeExerciseIds,
      priorityTargets,
      targetExerciseCount: Math.max(0, targetExerciseCount - templateExerciseCount),
    }).map(buildExerciseDraft);

    const initialExercises = [...templateExercises, ...generatedExercises];

    if (initialExercises.length === 0) {
      throw new Error("Failed to select any exercises for the workout.");
    }

    dispatch(
      startWorkout({
        initialExercises,
        mesocycleId: activeProgram?.mesocycle.id,
        mesocycleProtocol: activeProgram?.mesocycle.protocol,
        mesocycleSessionId: templateExerciseCount > 0 ? nextSession?.id : undefined,
        mesocycleWeek: activeProgram?.current_week,
        ownerUserId: user?.id ?? null,
        sessionFocus,
      })
    );

    const targetedArchetypes = uniqueStrings(
      initialExercises.map(exercise =>
        getArchetypeName(exercise.exercise, archetypeMap)
      )
    ).map(archetypeName => ARCHETYPE_LABELS[archetypeName] ?? archetypeName);

    const source: GeneratedWorkoutSummary["source"] =
      templateExerciseCount > 0 && generatedExercises.length === 0
        ? "periodized_template"
        : templateExerciseCount > 0
          ? "hybrid"
          : "volume_deficit";

    const selectedExerciseNames = initialExercises.map(
      exercise => exercise.exercise.name
    );

    return {
      message: buildGeneratorMessage({
        activeProgram,
        nextSession,
        selectedExercises: selectedExerciseNames,
        sessionFocus,
        source,
        targetedArchetypes,
      }),
      ...(activeProgram
        ? {
            mesocycle: {
              currentWeek: activeProgram.current_week,
              name: activeProgram.mesocycle.name,
              protocol: activeProgram.mesocycle.protocol,
              ...(nextSession?.name ? { sessionName: nextSession.name } : {}),
            },
          }
        : {}),
      selectedExercises: selectedExerciseNames,
      sessionFocus,
      source,
      targetedArchetypes:
        targetedArchetypes.length > 0
          ? targetedArchetypes
          : priorityTargets.slice(0, 3).map(target => target.label),
      volumeFocus: priorityTargets.slice(0, 4).map(target => ({
        archetype: target.label,
        currentSets: target.currentSets,
        deficit: target.deficit,
        goalSets: target.goalSets,
      })),
    };
  };

  return {
    generateWorkout,
    isReady: exercisesWithArchetypes.length > 0 && !!movementArchetypes,
  };
};
