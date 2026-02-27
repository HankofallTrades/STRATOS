import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flame, Trophy } from "lucide-react";

import { Button } from "@/components/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { useAuth } from '@/state/auth/AuthProvider';
import { useAppSelector } from "@/hooks/redux";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";
import { usePeriodization } from "@/domains/periodization";
import { fetchRecentWorkoutsSummary } from '@/domains/analytics/model/analyticsRepository';
import { fetchUserProfile } from '@/domains/account/model/accountRepository';
import { useTriad, useHabitCompletions } from '@/domains/habits';
import { supabase } from '@/lib/integrations/supabase/client';
import type { SessionFocus } from '@/lib/types/workout';
import { calculateOneRepMax } from '@/lib/utils/workoutUtils';

const formatLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const daysAgoLabel = (isoDateTime: string): string => {
  const input = new Date(isoDateTime);
  const now = new Date();

  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfInput = new Date(input.getFullYear(), input.getMonth(), input.getDate());
  const diffDays = Math.round((startOfNow.getTime() - startOfInput.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
};

const greetingFromHour = (hour: number): string => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatSessionFocusLabel = (focus: SessionFocus): string => {
  const labels: Record<SessionFocus, string> = {
    hypertrophy: 'Hypertrophy',
    strength: 'Strength',
    zone2: 'Zone 2',
    zone5: 'Zone 5',
    speed: 'Speed',
    recovery: 'Recovery',
    mixed: 'Mixed',
  };
  return labels[focus];
};

const estimateSessionMinutes = (exerciseCount: number, protocol?: 'occams' | 'custom'): number => {
  if (exerciseCount <= 0) return 30;
  if (protocol === 'occams') {
    return Math.max(20, exerciseCount * 8 + 8);
  }
  return Math.max(30, exerciseCount * 8 + 15);
};

const inferMuscleTagsFromExercises = (exerciseNames: string[]): string[] => {
  const tags = new Set<string>();

  for (const name of exerciseNames) {
    const normalized = name.toLowerCase();
    if (normalized.includes('pull') || normalized.includes('row')) tags.add('Back');
    if (normalized.includes('bicep') || normalized.includes('curl')) tags.add('Biceps');
    if (normalized.includes('rear delt')) tags.add('Rear Delts');
    if (normalized.includes('chest') || normalized.includes('bench')) tags.add('Chest');
    if (normalized.includes('shoulder') || normalized.includes('overhead')) tags.add('Shoulders');
    if (normalized.includes('tricep') || normalized.includes('pushdown')) tags.add('Triceps');
    if (normalized.includes('leg') || normalized.includes('squat')) tags.add('Legs');
  }

  return Array.from(tags).slice(0, 3);
};

const inferSessionLabel = (exerciseNames: string[]): string => {
  const names = exerciseNames.map(name => name.toLowerCase());
  const isPull = names.some(name => name.includes('pull') || name.includes('row'));
  const isPush = names.some(name => name.includes('press') || name.includes('chest'));
  const isLower = names.some(name => name.includes('leg') || name.includes('squat'));

  if (isLower) return 'Lower Body';
  if (isPull && !isPush) return 'Upper Body Pull';
  if (isPush && !isPull) return 'Upper Body Push';
  if (isPull && isPush) return 'Upper Body Mixed';
  return 'Strength Session';
};

const formatLiftWeight = (valueKg: number, preferredUnit: string | null | undefined): string => {
  if ((preferredUnit ?? '').toLowerCase().includes('lb')) {
    const pounds = Math.round(valueKg * 2.20462);
    return `${pounds} lbs`;
  }

  const rounded = Number(valueKg.toFixed(1));
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} kg`;
};

const formatSessionDuration = (durationSeconds: number | null | undefined): string => {
  const seconds = durationSeconds ?? 0;
  if (seconds <= 0) return '< 5 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 5) return '< 5 min';
  return `${minutes} min`;
};

const formatReps = (value: number): string => {
  const normalized = Number(value.toFixed(1));
  return Number.isInteger(normalized) ? normalized.toFixed(0) : normalized.toFixed(1);
};

const E1RM_IMPROVEMENT_EPSILON = 0.001;

const firstOrSelf = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const calculateStreak = (
  completionDates: string[],
  todayIso: string,
  includeToday: boolean
): number => {
  const dateSet = new Set(completionDates);
  const hasToday = includeToday || dateSet.has(todayIso);

  const getPrevDay = (iso: string): string => {
    const date = new Date(`${iso}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return formatLocalIsoDate(date);
  };

  let cursor = hasToday ? todayIso : getPrevDay(todayIso);
  let streak = 0;

  while (true) {
    if (cursor === todayIso && hasToday) {
      streak += 1;
      cursor = getPrevDay(cursor);
      continue;
    }

    if (!dateSet.has(cursor)) {
      break;
    }

    streak += 1;
    cursor = getPrevDay(cursor);
  }

  return streak;
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const userId = user?.id;
  const now = new Date();
  const todayIso = useMemo(() => formatLocalIsoDate(new Date()), []);

  const { activeProgram } = usePeriodization(userId);
  const { habits } = useTriad(userId);
  const { completions, toggleCompletion, pendingIds, isLoading: isLoadingCompletions } = useHabitCompletions(userId, todayIso);

  const movementHabit = useMemo(
    () => habits.find(habit => habit.title.toLowerCase() === 'movement') ?? null,
    [habits]
  );

  const meditationHabit = useMemo(
    () => habits.find(habit => habit.title.toLowerCase() === 'meditation') ?? null,
    [habits]
  );

  const writingHabit = useMemo(
    () => habits.find(habit => habit.title.toLowerCase() === 'writing') ?? null,
    [habits]
  );

  const { data: profile } = useQuery({
    queryKey: ['homeProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      return fetchUserProfile(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentWorkouts = [] } = useQuery({
    queryKey: ['homeRecentWorkouts', userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchRecentWorkoutsSummary(userId, 5);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const lastSession = recentWorkouts[0] ?? null;
  const workoutLoggedToday = Boolean(
    lastSession && formatLocalIsoDate(new Date(lastSession.workout_created_at)) === todayIso
  );
  const workoutStartedToday = !!currentWorkout && currentWorkout.date.slice(0, 10) === todayIso;
  const workoutMovementDone = workoutStartedToday || workoutLoggedToday;

  const { data: movementStreak = 0 } = useQuery({
    queryKey: ['movementStreak', userId, movementHabit?.id, todayIso, currentWorkout?.id, lastSession?.workout_created_at],
    queryFn: async () => {
      if (!userId || !movementHabit?.id) return 0;

      const { data, error } = await supabase
        .from('habit_completions')
        .select('date')
        .eq('user_id', userId)
        .eq('habit_id', movementHabit.id)
        .order('date', { ascending: false })
        .limit(365);

      if (error) throw error;

      const completionDates = (data ?? []).map(row => row.date as string);
      return calculateStreak(completionDates, todayIso, workoutMovementDone);
    },
    enabled: !!userId && !!movementHabit?.id,
    staleTime: 60 * 1000,
  });

  const { data: recentPr } = useQuery({
    queryKey: ['homeRecentPr', 'v2', userId, profile?.preferred_weight_unit],
    queryFn: async () => {
      if (!userId) return null;

      type WeightedSetRow = {
        weight: number | null;
        reps: number | null;
        workout_exercises: {
          workout_id: string;
          exercise_id: string;
          exercises: { name: string } | { name: string }[] | null;
          workouts: { created_at: string } | { created_at: string }[] | null;
        } | {
          workout_id: string;
          exercise_id: string;
          exercises: { name: string } | { name: string }[] | null;
          workouts: { created_at: string } | { created_at: string }[] | null;
        }[] | null;
      };

      const setRows: WeightedSetRow[] = [];
      const pageSize = 1000;
      let pageStart = 0;

      while (true) {
        const { data, error } = await supabase
          .from('exercise_sets')
          .select(`
            weight,
            reps,
            workout_exercises!inner(
              workout_id,
              exercise_id,
              exercises!inner(name),
              workouts!inner(created_at, user_id)
            )
          `)
          .eq('completed', true)
          .gt('weight', 0)
          .gt('reps', 0)
          .eq('workout_exercises.workouts.user_id', userId)
          .range(pageStart, pageStart + pageSize - 1);

        if (error) throw error;

        const page = (data ?? []) as WeightedSetRow[];
        setRows.push(...page);

        if (page.length < pageSize) break;
        pageStart += pageSize;
      }

      if (setRows.length === 0) return null;

      const bestPerWorkoutExercise = new Map<string, {
        exerciseId: string;
        exerciseName: string;
        workoutCreatedAt: string;
        maxE1RM: number;
        topSetWeightKg: number;
        topSetReps: number;
      }>();

      for (const row of setRows) {
        const weight = typeof row.weight === 'number' ? row.weight : Number(row.weight);
        const reps = typeof row.reps === 'number' ? row.reps : Number(row.reps);
        if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) continue;

        const workoutExercise = firstOrSelf(row.workout_exercises);
        if (!workoutExercise) continue;

        const workout = firstOrSelf(workoutExercise.workouts);
        const exercise = firstOrSelf(workoutExercise.exercises);
        if (!workout?.created_at || !workoutExercise.exercise_id || !workoutExercise.workout_id) continue;

        const e1rm = calculateOneRepMax(weight, reps);
        if (!Number.isFinite(e1rm) || e1rm <= 0) continue;

        const key = `${workoutExercise.exercise_id}:${workoutExercise.workout_id}`;
        const existing = bestPerWorkoutExercise.get(key);

        if (!existing || e1rm > existing.maxE1RM) {
          bestPerWorkoutExercise.set(key, {
            exerciseId: workoutExercise.exercise_id,
            exerciseName: exercise?.name?.trim() || 'Exercise',
            workoutCreatedAt: workout.created_at,
            maxE1RM: e1rm,
            topSetWeightKg: weight,
            topSetReps: reps,
          });
        }
      }

      const orderedPerformances = Array.from(bestPerWorkoutExercise.values())
        .sort((a, b) => new Date(a.workoutCreatedAt).getTime() - new Date(b.workoutCreatedAt).getTime());

      const runningMaxByExercise = new Map<string, number>();
      let latestPrEvent: {
        exerciseName: string;
        workoutCreatedAt: string;
        maxE1RM: number;
        deltaE1RM: number;
        topSetWeightKg: number;
        topSetReps: number;
      } | null = null;

      for (const performance of orderedPerformances) {
        const previousMax = runningMaxByExercise.get(performance.exerciseId);

        if (
          previousMax !== undefined
          && performance.maxE1RM > previousMax + E1RM_IMPROVEMENT_EPSILON
        ) {
          latestPrEvent = {
            exerciseName: performance.exerciseName,
            workoutCreatedAt: performance.workoutCreatedAt,
            maxE1RM: performance.maxE1RM,
            deltaE1RM: performance.maxE1RM - previousMax,
            topSetWeightKg: performance.topSetWeightKg,
            topSetReps: performance.topSetReps,
          };
        }

        if (previousMax === undefined || performance.maxE1RM > previousMax) {
          runningMaxByExercise.set(performance.exerciseId, performance.maxE1RM);
        }
      }

      if (!latestPrEvent) return null;

      return {
        exerciseName: latestPrEvent.exerciseName,
        topSetWeightLabel: formatLiftWeight(latestPrEvent.topSetWeightKg, profile?.preferred_weight_unit),
        topSetReps: latestPrEvent.topSetReps,
        topSetRepsLabel: formatReps(latestPrEvent.topSetReps),
        currentE1RMLabel: formatLiftWeight(latestPrEvent.maxE1RM, profile?.preferred_weight_unit),
        deltaE1RMLabel: formatLiftWeight(latestPrEvent.deltaE1RM, profile?.preferred_weight_unit),
        whenLabel: daysAgoLabel(latestPrEvent.workoutCreatedAt),
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const nextSession = useMemo(() => {
    if (!activeProgram) return null;
    return activeProgram.sessions.find(session => session.id === activeProgram.next_session_id)
      ?? activeProgram.sessions[0]
      ?? null;
  }, [activeProgram]);

  const todayWorkoutTitle = useMemo(() => {
    if (!activeProgram) return 'Today\'s Session';
    if (nextSession?.name) return nextSession.name;
    return `${formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)} Session`;
  }, [activeProgram, nextSession]);

  const todayWorkoutExerciseNames = useMemo(
    () => (nextSession?.exercises ?? []).map(item => item.exercise?.name).filter((value): value is string => !!value),
    [nextSession]
  );

  const todayWorkoutMuscleTags = useMemo(() => {
    const inferred = inferMuscleTagsFromExercises(todayWorkoutExerciseNames);
    if (inferred.length > 0) return inferred;

    if (!activeProgram) return ['General'];
    return [formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)];
  }, [todayWorkoutExerciseNames, activeProgram]);

  const todayExerciseCount = nextSession?.exercises.length ?? 0;
  const todayEstimatedMinutes = estimateSessionMinutes(todayExerciseCount, activeProgram?.mesocycle.protocol);

  const displayName = useMemo(() => {
    const username = profile?.username?.trim();
    if (username) return username;

    const metadataName = (user?.user_metadata?.first_name as string | undefined)
      ?? (user?.user_metadata?.full_name as string | undefined)
      ?? null;

    if (metadataName) {
      const first = metadataName.trim().split(/\s+/)[0];
      if (first) return first;
    }

    const emailPrefix = user?.email?.split('@')[0];
    return emailPrefix || 'Athlete';
  }, [profile?.username, user?.user_metadata, user?.email]);

  const movementCompletionRecorded = movementHabit ? Boolean(completions[movementHabit.id]) : false;
  const movementDone = movementCompletionRecorded || workoutMovementDone;
  const meditationDone = meditationHabit ? Boolean(completions[meditationHabit.id]) : false;
  const writingDone = writingHabit ? Boolean(completions[writingHabit.id]) : false;

  const movementAutoSyncKeyRef = useRef<string>('');

  useEffect(() => {
    if (!movementHabit?.id || !userId) return;
    if (!workoutLoggedToday) return;
    if (movementCompletionRecorded) return;

    const syncKey = `${userId}:${movementHabit.id}:${todayIso}`;
    if (movementAutoSyncKeyRef.current === syncKey) return;

    movementAutoSyncKeyRef.current = syncKey;
    toggleCompletion(movementHabit.id, true);
  }, [movementCompletionRecorded, movementHabit?.id, toggleCompletion, todayIso, userId, workoutLoggedToday]);

  const handleToggleHabit = (habitId: string | undefined, completed: boolean) => {
    if (!habitId || !userId) return;
    toggleCompletion(habitId, !completed);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">{greetingFromHour(now.getHours())}, {displayName}</p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Time to train.</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 self-start md:self-auto">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {movementStreak > 0 ? `${movementStreak}-day streak` : 'Start your streak today'}
            </span>
          </div>
        </header>

        <main className="space-y-5">
          <Card className="relative overflow-hidden border-primary/50 bg-gradient-to-br from-primary/10 via-card to-card">
            <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm tracking-wide text-muted-foreground uppercase">Today&apos;s Workout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">{todayWorkoutTitle}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {todayWorkoutMuscleTags.join(' · ')}
                  {'  ·  '}
                  ~{todayEstimatedMinutes} min
                  {'  ·  '}
                  {todayExerciseCount || 1} {todayExerciseCount === 1 ? 'exercise' : 'exercises'}
                </p>
              </div>

              <Button onClick={() => navigate('/workout')} size="lg" className="w-full h-12 text-base font-semibold">
                Begin Session
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm tracking-wide text-muted-foreground uppercase">Last Session</CardTitle>
              </CardHeader>
              <CardContent>
                {lastSession ? (
                  <>
                    <p className="text-lg font-semibold">
                      {inferSessionLabel(lastSession.exercise_names)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {daysAgoLabel(lastSession.workout_created_at)}
                      {'  ·  '}
                      {formatSessionDuration(lastSession.duration_seconds)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm tracking-wide text-muted-foreground uppercase">Recent PR</CardTitle>
              </CardHeader>
              <CardContent>
                {recentPr ? (
                  <>
                    <p className="text-lg font-semibold">{recentPr.exerciseName}</p>
                    {recentPr.topSetWeightLabel && recentPr.topSetRepsLabel ? (
                      <p className="text-sm font-medium">
                        {recentPr.topSetWeightLabel} x {recentPr.topSetRepsLabel} reps
                      </p>
                    ) : null}
                    <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
                      <span>{recentPr.whenLabel}</span>
                      <span>·</span>
                      <Trophy className="h-3.5 w-3.5 text-primary" />
                      <span>+{recentPr.deltaE1RMLabel} vs previous best</span>
                      <span>·</span>
                      <span>e1RM {recentPr.currentE1RMLabel}</span>
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No e1RM PR increase recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-muted-foreground font-medium uppercase tracking-wide">Today</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-2"
                  disabled={isLoadingCompletions || !movementHabit || !!(movementHabit && pendingIds[movementHabit.id])}
                  onClick={() => handleToggleHabit(movementHabit?.id, movementDone)}
                >
                  <span className={movementDone ? 'text-primary' : 'text-muted-foreground'}>{movementDone ? '◉' : '○'}</span>
                  <span className={movementDone ? 'font-medium' : ''}>Movement</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2"
                  disabled={isLoadingCompletions || !meditationHabit || !!(meditationHabit && pendingIds[meditationHabit.id])}
                  onClick={() => handleToggleHabit(meditationHabit?.id, meditationDone)}
                >
                  <span className={meditationDone ? 'text-primary' : 'text-muted-foreground'}>{meditationDone ? '◉' : '○'}</span>
                  <span className={meditationDone ? 'font-medium' : ''}>Meditation</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2"
                  disabled={isLoadingCompletions || !writingHabit || !!(writingHabit && pendingIds[writingHabit.id])}
                  onClick={() => handleToggleHabit(writingHabit?.id, writingDone)}
                >
                  <span className={writingDone ? 'text-primary' : 'text-muted-foreground'}>{writingDone ? '◉' : '○'}</span>
                  <span className={writingDone ? 'font-medium' : ''}>Writing</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Home;
