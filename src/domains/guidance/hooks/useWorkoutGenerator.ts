import { differenceInDays, startOfDay } from "date-fns";
import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";

import {
  fetchWeeklyArchetypeSets,
  type WeeklyArchetypeSetData,
} from "@/domains/analytics/data/analyticsRepository";
import {
  buildVolumeProgressDisplayData,
  getCurrentWeekRange,
} from "@/domains/analytics/hooks/useVolumeChart";
import type { DisplayArchetypeData } from "@/domains/analytics/hooks/useVolumeChart";
import { buildExercisesFromSessionTemplate } from "@/domains/fitness/data/workoutScreen";
import type {
  ActiveMesocycleProgram,
  MesocycleSessionTemplate,
} from "@/domains/periodization";
import {
  fetchGuidanceExercises,
  fetchMovementArchetypes,
} from "@/domains/guidance/data/guidanceRepository";
import type { CoachToolResultPayload } from "@/domains/guidance/agent/contracts";
import { proposeWorkoutInputSchema } from "@/domains/guidance/agent/tools";
import { getActiveMesocycleProgram } from "@/domains/periodization/data/repository";
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
import type { AppDispatch } from "@/state/store";
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

export interface WorkoutConstraints {
  focus?: SessionFocus | null;
  durationMinutes?: number | null;
  targetArchetypes?: string[] | null;
  avoidArchetypes?: string[] | null;
}

export interface MovementArchetypeOption {
  id: string;
  name: string;
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

interface GenerateStrengthWorkoutParams {
  baseExercises: Exercise[];
  constraints?: WorkoutConstraints;
  dispatch: AppDispatch;
  movementArchetypes: MovementArchetypeOption[];
  planningContext?: WorkoutGeneratorPlanningContext;
  userId: string | null;
  workoutHistory: Workout[];
}

const shuffle = <T,>(values: T[]): T[] => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

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

    const candidates = availableExercises.filter(exercise => {
      if (
        alreadySelectedExerciseIds.has(exercise.id) ||
        excludeExerciseIds.includes(exercise.id)
      ) {
        return false;
      }

      return getArchetypeName(exercise, archetypeMap) === target.name;
    });

    if (candidates.length === 0) {
      continue;
    }

    const match = candidates[Math.floor(Math.random() * candidates.length)];

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
  return [...selectedExercises, ...shuffle(fallbackExercises).slice(0, remainingCount)];
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
  movementArchetypes: MovementArchetypeOption[] | undefined,
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

  const generateWorkout = async (): Promise<GeneratedWorkoutSummary> =>
    generateStrengthWorkout({
      baseExercises: exercisesWithArchetypes,
      dispatch,
      movementArchetypes: movementArchetypes ?? [],
      planningContext,
      userId: user?.id ?? null,
      workoutHistory,
    });

  return {
    generateWorkout,
    isReady: exercisesWithArchetypes.length > 0 && !!movementArchetypes,
  };
};

export interface WorkoutPlanResult {
  summary: GeneratedWorkoutSummary;
  startWorkoutPayload: Parameters<typeof startWorkout>[0];
}

export const buildWorkoutPlan = async ({
  baseExercises,
  constraints,
  movementArchetypes,
  planningContext,
  userId,
  workoutHistory,
}: Omit<GenerateStrengthWorkoutParams, "dispatch">): Promise<WorkoutPlanResult> => {
  const archetypeMap = new Map(
    movementArchetypes.map(archetype => [archetype.id, archetype.name])
  );
  const exercisesWithArchetypes = baseExercises.filter(
    exercise => exercise.archetype_id && archetypeMap.has(exercise.archetype_id)
  );

  if (exercisesWithArchetypes.length === 0) {
    throw new Error("Exercise data with archetypes is not available.");
  }

  const exerciseMap = new Map(
    exercisesWithArchetypes.map(exercise => [exercise.id, exercise])
  );
  const activeProgram = planningContext?.activeProgram ?? null;
  const nextSession = getNextSession(activeProgram);
  const sessionFocus =
    constraints?.focus ??
    normalizeStrengthSessionFocus(
      nextSession?.session_focus ?? activeProgram?.mesocycle.goal_focus
    );
  const recencyConstraints = resolveRecencyConstraints(workoutHistory);
  const weeklySets = calculateWeeklySetsPerArchetype(
    workoutHistory,
    exerciseMap,
    archetypeMap
  );

  const avoidArchetypes = new Set(constraints?.avoidArchetypes ?? []);
  const requestedArchetypes = (constraints?.targetArchetypes ?? []).filter(
    name => !avoidArchetypes.has(name)
  );

  const basePriorityTargets = (
    planningContext?.volumeProgress && planningContext.volumeProgress.length > 0
      ? buildDeficitsFromProgressData(planningContext.volumeProgress)
      : buildDeficitsFromWeeklySets(weeklySets)
  ).filter(target => !avoidArchetypes.has(target.name));

  // Requested archetypes lead the priority order so they're selected first,
  // synthesizing a target for any that have no current deficit.
  const priorityTargets = [
    ...requestedArchetypes.map(
      name =>
        basePriorityTargets.find(target => target.name === name) ??
        createArchetypeDeficit(name, 0, ARCHETYPE_TARGETS[name] ?? 5)
    ),
    ...basePriorityTargets.filter(
      target => !requestedArchetypes.includes(target.name)
    ),
  ];

  const avoidedExerciseIds =
    avoidArchetypes.size > 0
      ? exercisesWithArchetypes
          .filter(exercise => {
            const archetype = getArchetypeName(exercise, archetypeMap);
            return archetype ? avoidArchetypes.has(archetype) : false;
          })
          .map(exercise => exercise.id)
      : [];
  const excludeExerciseIds = Array.from(
    new Set([...recencyConstraints.excludeExerciseIds, ...avoidedExerciseIds])
  );

  const requestedExerciseCount =
    constraints?.durationMinutes != null
      ? Math.min(8, Math.max(2, Math.round(constraints.durationMinutes / 12)))
      : null;

  const templateExercises =
    nextSession?.exercises.some(
      sessionExercise =>
        sessionExercise.exercise &&
        sessionExercise.exercise.exercise_type !== "cardio"
    )
      ? (await buildExercisesFromSessionTemplate(nextSession, userId ?? "")).filter(
          exercise => exercise.exercise.exercise_type !== "cardio"
        )
      : [];

  const defaultExerciseCount =
    requestedExerciseCount ??
    DEFAULT_EXERCISE_COUNT_BY_FOCUS[sessionFocus] ??
    DEFAULT_EXERCISE_COUNT_BY_FOCUS.strength;
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
    excludeExerciseIds,
    priorityTargets,
    targetExerciseCount: Math.max(0, targetExerciseCount - templateExerciseCount),
  }).map(buildExerciseDraft);

  const initialExercises = [...templateExercises, ...generatedExercises];

  if (initialExercises.length === 0) {
    throw new Error("Failed to select any exercises for the workout.");
  }

  const startWorkoutPayload = {
    initialExercises,
    mesocycleId: activeProgram?.mesocycle.id,
    mesocycleProtocol: activeProgram?.mesocycle.protocol,
    mesocycleSessionId: templateExerciseCount > 0 ? nextSession?.id : undefined,
    mesocycleWeek: activeProgram?.current_week,
    ownerUserId: userId,
    sessionFocus,
  };

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

  const summary: GeneratedWorkoutSummary = {
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

  return { summary, startWorkoutPayload };
};

export const commitWorkoutPlan = (
  dispatch: AppDispatch,
  startWorkoutPayload: WorkoutPlanResult["startWorkoutPayload"]
) => {
  dispatch(startWorkout(startWorkoutPayload));
};

export const generateStrengthWorkout = async (
  params: GenerateStrengthWorkoutParams
): Promise<GeneratedWorkoutSummary> => {
  const { dispatch, ...rest } = params;
  const { summary, startWorkoutPayload } = await buildWorkoutPlan(rest);
  commitWorkoutPlan(dispatch, startWorkoutPayload);
  return summary;
};

export const useProposeWorkout = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const workoutHistory = useAppSelector(selectWorkoutHistory);

  return useCallback(async (
    input: Record<string, unknown> = {}
  ): Promise<CoachToolResultPayload> => {
    const parsedInput = proposeWorkoutInputSchema.safeParse(input);
    const constraints: WorkoutConstraints = parsedInput.success
      ? {
          focus: parsedInput.data.focus,
          durationMinutes: parsedInput.data.durationMinutes,
          targetArchetypes: parsedInput.data.targetArchetypes,
          avoidArchetypes: parsedInput.data.avoidArchetypes,
        }
      : {};
    const userId = user?.id ?? null;
    const weekRange = getCurrentWeekRange();
    const [baseExercises, movementArchetypes, activeProgram, weeklyArchetypeSets] =
      await Promise.all([
        queryClient.ensureQueryData({
          queryKey: ["exercises"],
          queryFn: fetchGuidanceExercises,
          staleTime: Infinity,
        }),
        queryClient.ensureQueryData({
          queryKey: ["movementArchetypes"],
          queryFn: fetchMovementArchetypes,
          staleTime: Infinity,
        }),
        userId
          ? queryClient.ensureQueryData({
              queryKey: ["activeMesocycleProgram", userId],
              queryFn: () => getActiveMesocycleProgram(userId),
              staleTime: 60 * 1000,
            })
          : Promise.resolve(null),
        userId
          ? queryClient.ensureQueryData({
              queryKey: [
                "weeklyArchetypeSets_v2",
                userId,
                weekRange.start,
                weekRange.end,
              ],
              queryFn: () =>
                fetchWeeklyArchetypeSets(userId, weekRange.start, weekRange.end),
              staleTime: 5 * 60 * 1000,
            })
          : Promise.resolve([] as WeeklyArchetypeSetData[]),
      ]);

    const { summary, startWorkoutPayload } = await buildWorkoutPlan({
      baseExercises,
      constraints,
      movementArchetypes,
      planningContext: {
        activeProgram,
        volumeProgress: buildVolumeProgressDisplayData(weeklyArchetypeSets),
      },
      userId,
      workoutHistory,
    });

    return {
      message: summary.message,
      data: { summary },
      artifact: {
        type: "workout_draft",
        title: "Proposed session",
        rationale: summary.message,
        sessionFocus: summary.sessionFocus,
        exercises: summary.selectedExercises.map((name) => ({ name, sets: 3 })),
        apply: {
          startWorkoutPayload: startWorkoutPayload as Record<string, unknown>,
        },
      },
    };
  }, [queryClient, user?.id, workoutHistory]);
};
