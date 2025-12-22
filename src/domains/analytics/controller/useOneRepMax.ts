import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Exercise } from '@/lib/types/workout';
import { DailyMaxE1RM } from '@/lib/types/analytics';
import * as analyticsRepo from '../model/analyticsRepository';

export type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface UnifiedDataPoint {
    workout_timestamp: number;
    workout_date: string;
    [combinationKey: string]: number | string | undefined | null | Record<string, string | undefined>;
    _originalEquipment?: {
        [combinationKey: string]: string | undefined;
    };
}

const SELECTED_EXERCISE_STORAGE_KEY = 'selectedAnalyticsExerciseId';

const getCombinationKey = (
    variation?: string | null,
    equipmentType?: string | null
): string => {
    const varPart = (!variation || variation.toLowerCase() === 'standard') ? 'Default' : variation;
    let eqPart = equipmentType || 'Default';
    if (equipmentType === 'Dumbbell' || equipmentType === 'Kettlebell') {
        eqPart = 'DB_KB_COMBO';
    }
    return `${varPart}|${eqPart}`;
};

export const useOneRepMax = (userId: string | undefined, exercises: Exercise[]) => {
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [allCombinationKeys, setAllCombinationKeys] = useState<string[]>([]);
    const [activeCombinationKeys, setActiveCombinationKeys] = useState<string[]>([]);
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('ALL');

    // Initialize/Sync selected exercise from storage
    useEffect(() => {
        if (!selectedExercise && exercises.length > 0) {
            const storedId = localStorage.getItem(SELECTED_EXERCISE_STORAGE_KEY);
            if (storedId) {
                const found = exercises.find(ex => ex.id === storedId);
                if (found) setSelectedExercise(found);
            }
        }
    }, [exercises, selectedExercise]);

    useEffect(() => {
        if (selectedExercise) {
            localStorage.setItem(SELECTED_EXERCISE_STORAGE_KEY, selectedExercise.id);
        }
    }, [selectedExercise]);

    // Fetch history
    const {
        data: maxE1RMHistory = [],
        isLoading: isLoadingHistory,
        error: errorHistory
    } = useQuery<DailyMaxE1RM[], Error>({
        queryKey: ['maxE1RMHistory', selectedExercise?.id, userId],
        queryFn: () => {
            if (!userId || !selectedExercise?.id) return Promise.resolve([]);
            return analyticsRepo.fetchMaxE1RMHistory(userId, selectedExercise.id);
        },
        enabled: !!userId && !!selectedExercise?.id,
        staleTime: 5 * 60 * 1000,
    });

    // Track which exercise the keys were initialized for
    const [lastInitializedExerciseId, setLastInitializedExerciseId] = useState<string | null>(null);

    // Process keys
    useEffect(() => {
        if (!maxE1RMHistory || maxE1RMHistory.length === 0) {
            setAllCombinationKeys([]);
            setActiveCombinationKeys([]);
            return;
        }

        const uniqueKeys = new Set<string>();
        const keyFrequency: Record<string, number> = {};

        maxE1RMHistory.forEach(item => {
            const key = getCombinationKey(item.variation, item.equipment_type);
            uniqueKeys.add(key);
            keyFrequency[key] = (keyFrequency[key] || 0) + 1;
        });

        const sortedKeys = Array.from(uniqueKeys).sort((a, b) => {
            const aIsDefault = a.startsWith('Default|');
            const bIsDefault = b.startsWith('Default|');
            if (aIsDefault && !bIsDefault) return -1;
            if (!aIsDefault && bIsDefault) return 1;
            return a.localeCompare(b);
        });

        if (JSON.stringify(sortedKeys) !== JSON.stringify(allCombinationKeys)) {
            setAllCombinationKeys(sortedKeys);
        }

        // Only auto-select the most frequent key if we haven't initialized for this exercise yet
        // OR if the current active keys are no longer valid for this exercise
        const currentExerciseId = selectedExercise?.id || null;
        const needsInitialization = lastInitializedExerciseId !== currentExerciseId;
        const currentKeysValid = activeCombinationKeys.every(k => sortedKeys.includes(k)) && activeCombinationKeys.length > 0;

        if (needsInitialization || !currentKeysValid) {
            let mostFrequentKey: string | null = null;
            let maxFreq = 0;
            Object.entries(keyFrequency).forEach(([key, freq]) => {
                if (freq > maxFreq) {
                    maxFreq = freq;
                    mostFrequentKey = key;
                }
            });

            const newActiveKeys = mostFrequentKey ? [mostFrequentKey] : (sortedKeys.length > 0 ? [sortedKeys[0]] : []);
            setActiveCombinationKeys(newActiveKeys);
            setLastInitializedExerciseId(currentExerciseId);
        }
    }, [maxE1RMHistory, selectedExercise?.id, allCombinationKeys, activeCombinationKeys, lastInitializedExerciseId]);

    // Transformation logic (moved from useMemo for clarity or kept as is)
    const chartContext = useMemo(() => {
        if (!maxE1RMHistory) return { chartData: [], domain: [0, 0] as [number, number], ticks: [] };

        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        const endDate = new Date(now);

        const sortedHistory = [...maxE1RMHistory].sort((a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime());

        const firstDataPointDateStr = sortedHistory.length > 0 ? sortedHistory[0].workout_date : null;
        const lastDataPointDateStr = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1].workout_date : null;

        let firstDataPointDate: Date;
        if (firstDataPointDateStr) {
            const parts = firstDataPointDateStr.split('-').map(Number);
            firstDataPointDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        } else {
            firstDataPointDate = new Date(now);
        }

        let startDate = new Date(now);
        let effectiveEndDate = new Date(endDate);

        if (selectedTimeRange !== 'ALL') {
            switch (selectedTimeRange) {
                case '1W': startDate.setUTCDate(now.getUTCDate() - 7); break;
                case '1M': startDate.setUTCMonth(now.getUTCMonth() - 1); break;
                case '3M': startDate.setUTCMonth(now.getUTCMonth() - 3); break;
                case '6M': startDate.setUTCMonth(now.getUTCMonth() - 6); break;
                case '1Y': startDate.setUTCFullYear(now.getUTCFullYear() - 1); break;
            }
        } else {
            startDate = new Date(firstDataPointDate);
            if (lastDataPointDateStr) {
                const parts = lastDataPointDateStr.split('-').map(Number);
                effectiveEndDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
            }
        }

        const allDatesInRange: Date[] = [];
        let currentDate = new Date(startDate);
        while (currentDate <= effectiveEndDate) {
            allDatesInRange.push(new Date(currentDate));
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        const historyByDate: Record<string, DailyMaxE1RM[]> = {};
        maxE1RMHistory.forEach(item => {
            const dateStr = item.workout_date;
            if (!historyByDate[dateStr]) historyByDate[dateStr] = [];
            historyByDate[dateStr].push(item);
        });

        const chartData: UnifiedDataPoint[] = allDatesInRange.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const dataForDate = historyByDate[dateStr] || [];
            const point: UnifiedDataPoint = {
                workout_timestamp: date.getTime(),
                workout_date: dateStr,
            };

            allCombinationKeys.forEach(key => {
                point[key] = null;
            });

            dataForDate.forEach(item => {
                const key = getCombinationKey(item.variation, item.equipment_type);
                if (item.max_e1rm != null && !isNaN(item.max_e1rm)) {
                    if (!point._originalEquipment) point._originalEquipment = {};
                    point._originalEquipment[key] = item.equipment_type || 'Default';
                    point[key] = item.max_e1rm;
                }
            });

            return point;
        });

        const domain: [number, number] = [startDate.getTime(), effectiveEndDate.getTime() + 1];
        const tickTimestamps: number[] = [startDate.getTime()];
        const dayMillis = 1000 * 60 * 60 * 24;
        const totalDays = Math.round((effectiveEndDate.getTime() - startDate.getTime()) / dayMillis);

        if (selectedTimeRange === '1Y') {
            const addedMonths = new Set<string>();
            let d = new Date(startDate);
            addedMonths.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
            d.setUTCDate(1);
            d.setUTCMonth(d.getUTCMonth() + 1);
            while (d <= effectiveEndDate) {
                const ts = d.getTime();
                if (ts <= effectiveEndDate.getTime()) {
                    tickTimestamps.push(ts);
                }
                d.setUTCMonth(d.getUTCMonth() + 1);
            }
        } else if (totalDays <= 10) {
            let d = new Date(startDate);
            d.setUTCDate(d.getUTCDate() + 1);
            while (d.getTime() < effectiveEndDate.getTime()) {
                tickTimestamps.push(d.getTime());
                d.setUTCDate(d.getUTCDate() + 1);
            }
        } else {
            const totalDurationMillis = effectiveEndDate.getTime() - startDate.getTime();
            const targetIntervals = 4;
            const tickIntervalMillis = totalDurationMillis > 0 ? totalDurationMillis / targetIntervals : dayMillis;
            let currentTick = startDate.getTime();
            for (let i = 1; i < targetIntervals; i++) {
                currentTick += tickIntervalMillis;
                if (currentTick < effectiveEndDate.getTime()) tickTimestamps.push(currentTick);
            }
        }

        if (tickTimestamps[tickTimestamps.length - 1] < effectiveEndDate.getTime()) {
            tickTimestamps.push(effectiveEndDate.getTime());
        }

        return { chartData, domain, ticks: Array.from(new Set(tickTimestamps)).sort((a, b) => a - b) };
    }, [maxE1RMHistory, selectedTimeRange, allCombinationKeys]);

    const toggleCombination = useCallback((key: string) => {
        setActiveCombinationKeys(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    }, []);

    return {
        selectedExercise,
        setSelectedExercise,
        selectedTimeRange,
        setSelectedTimeRange,
        isLoadingHistory,
        errorHistory,
        allCombinationKeys,
        activeCombinationKeys,
        toggleCombination,
        ...chartContext
    };
};
