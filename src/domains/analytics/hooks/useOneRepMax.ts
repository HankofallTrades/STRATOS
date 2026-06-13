import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Exercise } from '@/lib/types/workout';
import { DailyMaxE1RM } from '@/lib/types/analytics';
import * as analyticsRepo from '../data/analyticsRepository';

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
const SELECTED_TIME_RANGE_STORAGE_KEY = 'selectedAnalyticsTimeRange';
const SELECTED_COMBINATION_STORAGE_KEY = 'selectedAnalyticsCombinationByExercise';

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
    const [activeCombinationKeys, setActiveCombinationKeys] = useState<string[]>([]);
    const [lastInitializedExerciseId, setLastInitializedExerciseId] = useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(() => {
        const storedRange = localStorage.getItem(SELECTED_TIME_RANGE_STORAGE_KEY);
        const validRanges: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];
        return storedRange && validRanges.includes(storedRange as TimeRange)
            ? (storedRange as TimeRange)
            : 'ALL';
    });

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

    useEffect(() => {
        localStorage.setItem(SELECTED_TIME_RANGE_STORAGE_KEY, selectedTimeRange);
    }, [selectedTimeRange]);

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

    // Derive the available combination keys (and their frequency) from history.
    const { allCombinationKeys, keyFrequency } = useMemo(() => {
        const uniqueKeys = new Set<string>();
        const frequency: Record<string, number> = {};

        maxE1RMHistory.forEach(item => {
            const key = getCombinationKey(item.variation, item.equipment_type);
            uniqueKeys.add(key);
            frequency[key] = (frequency[key] || 0) + 1;
        });

        const sortedKeys = Array.from(uniqueKeys).sort((a, b) => {
            const aIsDefault = a.startsWith('Default|');
            const bIsDefault = b.startsWith('Default|');
            if (aIsDefault && !bIsDefault) return -1;
            if (!aIsDefault && bIsDefault) return 1;
            return a.localeCompare(b);
        });

        return { allCombinationKeys: sortedKeys, keyFrequency: frequency };
    }, [maxE1RMHistory]);

    // Initialize the active combination once per exercise (or when the current
    // selection is no longer valid). User legend toggles afterwards are preserved.
    useEffect(() => {
        if (allCombinationKeys.length === 0) {
            if (activeCombinationKeys.length > 0) setActiveCombinationKeys([]);
            return;
        }

        const currentExerciseId = selectedExercise?.id || null;
        const needsInitialization = lastInitializedExerciseId !== currentExerciseId;
        const currentKeysValid = activeCombinationKeys.length > 0
            && activeCombinationKeys.every(k => allCombinationKeys.includes(k));

        if (!needsInitialization && currentKeysValid) return;

        let mostFrequentKey: string | null = null;
        let maxFreq = 0;
        Object.entries(keyFrequency).forEach(([key, freq]) => {
            if (freq > maxFreq) {
                maxFreq = freq;
                mostFrequentKey = key;
            }
        });

        const storedCombinationsRaw = localStorage.getItem(SELECTED_COMBINATION_STORAGE_KEY);
        const storedCombinations: Record<string, string> = storedCombinationsRaw ? JSON.parse(storedCombinationsRaw) : {};
        const storedKeyForExercise = currentExerciseId ? storedCombinations[currentExerciseId] : undefined;

        const preferredKey = storedKeyForExercise && allCombinationKeys.includes(storedKeyForExercise)
            ? storedKeyForExercise
            : mostFrequentKey;

        setActiveCombinationKeys(preferredKey ? [preferredKey] : [allCombinationKeys[0]]);
        setLastInitializedExerciseId(currentExerciseId);
    }, [allCombinationKeys, keyFrequency, selectedExercise?.id, activeCombinationKeys, lastInitializedExerciseId]);

    useEffect(() => {
        if (!selectedExercise?.id || activeCombinationKeys.length === 0) return;

        const storedCombinationsRaw = localStorage.getItem(SELECTED_COMBINATION_STORAGE_KEY);
        const storedCombinations: Record<string, string> = storedCombinationsRaw ? JSON.parse(storedCombinationsRaw) : {};
        storedCombinations[selectedExercise.id] = activeCombinationKeys[0];
        localStorage.setItem(SELECTED_COMBINATION_STORAGE_KEY, JSON.stringify(storedCombinations));
    }, [selectedExercise?.id, activeCombinationKeys]);

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

        // Group history by its raw date string (YYYY-MM-DD) so chart rows key off
        // the same value the DB returns — no UTC round-trip mismatch.
        const historyByDate: Record<string, DailyMaxE1RM[]> = {};
        maxE1RMHistory.forEach(item => {
            const dateStr = item.workout_date;
            if (!historyByDate[dateStr]) historyByDate[dateStr] = [];
            historyByDate[dateStr].push(item);
        });

        const startMillis = startDate.getTime();
        const endMillis = effectiveEndDate.getTime();

        // One chart row per date that actually has data, within the selected range.
        const chartData: UnifiedDataPoint[] = Object.keys(historyByDate)
            .sort()
            .map(dateStr => {
                const parts = dateStr.split('-').map(Number);
                return { dateStr, timestamp: Date.UTC(parts[0], parts[1] - 1, parts[2]) };
            })
            .filter(({ timestamp }) => timestamp >= startMillis && timestamp <= endMillis)
            .map(({ dateStr, timestamp }) => {
                const point: UnifiedDataPoint = {
                    workout_timestamp: timestamp,
                    workout_date: dateStr,
                };

                allCombinationKeys.forEach(key => {
                    point[key] = null;
                });

                historyByDate[dateStr].forEach(item => {
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
            const d = new Date(startDate);
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
            const d = new Date(startDate);
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
