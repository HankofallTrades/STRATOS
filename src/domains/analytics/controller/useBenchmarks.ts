import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Exercise } from '@/lib/types/workout';
import { UserProfileData, getUserProfile } from '@/lib/integrations/supabase/user';
import * as analyticsRepo from '../model/analyticsRepository';

export type BenchmarkLevel = 'Solid' | 'Strong' | 'Elite';
export type BenchmarkTypeOption = 'Strength' | 'Calisthenics';

const STRENGTH_BENCHMARK_NAMES = ["Deadlift", "Squat", "Bench Press", "Row", "Overhead Press"] as const;
const CALISTHENIC_BENCHMARK_NAMES = ["Pull-up", "Push-up"] as const;

const BENCHMARK_MULTIPLIERS: Record<BenchmarkLevel, Record<string, number>> = {
    Solid: { "Deadlift": 1.75, "Squat": 1.25, "Bench Press": 1.0, "Row": 1.0, "Overhead Press": 0.75 },
    Strong: { "Deadlift": 2.5, "Squat": 2.0, "Bench Press": 1.5, "Row": 1.5, "Overhead Press": 1.0 },
    Elite: { "Deadlift": 3.0, "Squat": 2.5, "Bench Press": 2.0, "Row": 1.75, "Overhead Press": 1.25 }
};

const CALISTHENIC_BENCHMARK_GOALS: Record<BenchmarkLevel, Record<string, number>> = {
    Solid: { "Pull-up": 8, "Push-up": 30 },
    Strong: { "Pull-up": 15, "Push-up": 50 },
    Elite: { "Pull-up": 25, "Push-up": 75 }
};

const LOCAL_STORAGE_KEY = 'userBenchmarkLevel';

export const useBenchmarks = (userId: string | undefined, exercises: Exercise[]) => {
    const [selectedLevel, setSelectedLevel] = useState<BenchmarkLevel>(() => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored && ['Solid', 'Strong', 'Elite'].includes(stored)) return stored as BenchmarkLevel;
        } catch (e) { }
        return 'Strong';
    });

    const [levelPopoverOpen, setLevelPopoverOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, selectedLevel);
    }, [selectedLevel]);

    const { data: userProfile, isLoading: isLoadingProfile, error: errorProfile } = useQuery<UserProfileData | null, Error>({
        queryKey: ['userProfile', userId],
        queryFn: () => userId ? getUserProfile(userId) : Promise.resolve(null),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });

    // Strength Benchmarks
    const strengthExerciseIds = useMemo(() =>
        STRENGTH_BENCHMARK_NAMES.map(name => exercises.find(ex => ex.name.trim().toLowerCase() === name.toLowerCase())?.id).filter((id): id is string => !!id)
        , [exercises]);

    const { data: latestMaxE1RMs = [], isLoading: isLoadingStrength, error: errorStrength } = useQuery({
        queryKey: ['latestMaxE1RMs', userId, strengthExerciseIds],
        queryFn: () => userId ? analyticsRepo.fetchLatestMaxE1RMForExercises(userId, strengthExerciseIds) : Promise.resolve([]),
        enabled: !!userId && strengthExerciseIds.length > 0,
        staleTime: 15 * 60 * 1000,
    });

    const calculatedStrength = useMemo(() => {
        const weight = userProfile?.weight_kg;
        if (!weight || exercises.length === 0) return [];

        const multipliers = BENCHMARK_MULTIPLIERS[selectedLevel];
        return STRENGTH_BENCHMARK_NAMES.map(name => {
            const exercise = exercises.find(ex => ex.name.trim().toLowerCase() === name.toLowerCase());
            const e1rm = exercise ? latestMaxE1RMs.find(d => d.exercise_id === exercise.id)?.max_e1rm ?? null : null;
            const goal = weight * multipliers[name];
            return {
                name,
                currentValue: e1rm,
                goalValue: goal,
                progress: e1rm ? Math.min(100, (e1rm / goal) * 100) : 0
            };
        });
    }, [exercises, latestMaxE1RMs, userProfile, selectedLevel]);

    // Calisthenic Benchmarks
    const calisthenicExerciseIds = useMemo(() =>
        CALISTHENIC_BENCHMARK_NAMES.map(name => exercises.find(ex => ex.name.trim().toLowerCase() === name.toLowerCase())?.id).filter((id): id is string => !!id)
        , [exercises]);

    const { data: latestMaxReps = [], isLoading: isLoadingCalisthenics, error: errorCalisthenics } = useQuery({
        queryKey: ['latestMaxReps', userId, calisthenicExerciseIds],
        queryFn: () => userId ? analyticsRepo.fetchLatestMaxRepsForExercises(userId, calisthenicExerciseIds) : Promise.resolve([]),
        enabled: !!userId && calisthenicExerciseIds.length > 0,
        staleTime: 15 * 60 * 1000,
    });

    const calculatedCalisthenics = useMemo(() => {
        if (exercises.length === 0) return [];
        const goals = CALISTHENIC_BENCHMARK_GOALS[selectedLevel];
        return CALISTHENIC_BENCHMARK_NAMES.map(name => {
            const exercise = exercises.find(ex => ex.name.trim().toLowerCase() === name.toLowerCase());
            const reps = exercise ? latestMaxReps.find(d => d.exercise_id === exercise.id)?.max_reps ?? null : null;
            const goal = goals[name];
            return {
                name,
                currentValue: reps,
                goalValue: goal,
                progress: reps ? Math.min(100, (reps / goal) * 100) : 0
            };
        });
    }, [exercises, latestMaxReps, selectedLevel]);

    return {
        selectedLevel,
        setSelectedLevel,
        levelPopoverOpen,
        setLevelPopoverOpen,
        userProfile,
        isLoadingProfile,
        errorProfile,
        calculatedStrength,
        isLoadingStrength,
        errorStrength,
        calculatedCalisthenics,
        isLoadingCalisthenics,
        errorCalisthenics,
        STRENGTH_EXERCISE_COUNT: STRENGTH_BENCHMARK_NAMES.length,
        CALISTHENIC_EXERCISE_COUNT: CALISTHENIC_BENCHMARK_NAMES.length,
        foundStrengthCount: strengthExerciseIds.length,
        foundCalisthenicCount: calisthenicExerciseIds.length
    };
};
