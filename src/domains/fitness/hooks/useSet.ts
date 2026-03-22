import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch } from "@/hooks/redux";
import type { RecommendedStrengthSetPerformance } from '../data/recommendations';
import {
    ExerciseSet,
    isStrengthSet,
    isCardioSet,
    timeToSeconds,
    secondsToTime
} from "@/lib/types/workout";
import {
    updateSet as updateSetAction,
    updateCardioSet as updateCardioSetAction,
    deleteSet as deleteSetAction,
    completeSet as completeSetAction
} from "@/state/workout/workoutSlice";

interface UseSetProps {
    workoutExerciseId: string;
    set: ExerciseSet;
    userBodyweight?: number | null;
    isStatic: boolean;
    previousPerformance: { weight: number; reps: number | null; time_seconds?: number | null; distance_km?: number | null } | null;
    recommendedPerformance: RecommendedStrengthSetPerformance | null;
}

type StrengthSetUpdatePayload = {
    workoutExerciseId: string;
    setId: string;
    weight: number;
    reps: number | null;
    time?: ReturnType<typeof secondsToTime> | null;
    variation?: string;
    equipmentType?: string;
};

export const useSet = ({
    workoutExerciseId,
    set,
    userBodyweight,
    isStatic,
    previousPerformance,
    recommendedPerformance
}: UseSetProps) => {
    const dispatch = useAppDispatch();

    // Common State
    const [isCompleted, setIsCompleted] = useState(set.completed);

    // --- Strength Set State ---
    const strengthSet = isStrengthSet(set) ? set : null;
    const strengthSetWeight = strengthSet?.weight;
    const strengthSetReps = strengthSet?.reps;
    const strengthSetTime = strengthSet?.time;
    const strengthSetEquipmentType = strengthSet?.equipmentType;
    const [localWeight, setLocalWeight] = useState(() => (strengthSet && strengthSet.weight > 0 ? strengthSet.weight.toString() : ''));
    const [localReps, setLocalReps] = useState(() => (strengthSet && strengthSet.reps ? strengthSet.reps.toString() : ''));
    const [localTime, setLocalTime] = useState(() => (strengthSet && strengthSet.time ? timeToSeconds(strengthSet.time).toString() : ''));

    // Tracking if fields were touched (for performance indicator logic)
    const [weightTouched, setWeightTouched] = useState(false);
    const [repsTouched, setRepsTouched] = useState(false);
    const [timeTouched, setTimeTouched] = useState(false);

    // --- Cardio Set State ---
    const cardioSet = isCardioSet(set) ? set : null;
    const cardioSetTime = cardioSet?.time;
    const cardioSetDistanceKm = cardioSet?.distance_km;
    const [localDuration, setLocalDuration] = useState(() => (cardioSet ? timeToSeconds(cardioSet.time).toString() : ''));
    const [localDistance, setLocalDistance] = useState(() => (cardioSet ? (cardioSet.distance_km || 0).toString() : ''));

    // --- Cardio Timer ---
    const [cardioTimerRunning, setCardioTimerRunning] = useState(false);
    const cardioTimerStartRef = useRef<number | null>(null);

    const handleStartCardioTimer = useCallback(() => {
        cardioTimerStartRef.current = Date.now();
        setCardioTimerRunning(true);
    }, []);

    const handleStopCardioTimer = useCallback(() => {
        if (cardioTimerStartRef.current) {
            const elapsed = Math.round((Date.now() - cardioTimerStartRef.current) / 1000);
            setLocalDuration(String(elapsed));
            if (cardioSet) {
                dispatch(updateCardioSetAction({
                    workoutExerciseId,
                    setId: set.id,
                    time: secondsToTime(elapsed),
                    distance_km: parseFloat(localDistance) > 0 ? parseFloat(localDistance) : undefined,
                }));
            }
        }
        cardioTimerStartRef.current = null;
        setCardioTimerRunning(false);
    }, [dispatch, workoutExerciseId, set.id, cardioSet, localDistance]);

    // Live elapsed display while cardio timer is running
    useEffect(() => {
        if (!cardioTimerRunning || !cardioTimerStartRef.current) return;
        const interval = setInterval(() => {
            if (cardioTimerStartRef.current) {
                setLocalDuration(String(Math.round((Date.now() - cardioTimerStartRef.current) / 1000)));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [cardioTimerRunning]);

    // --- Sync Effects ---
    useEffect(() => {
        setIsCompleted(set.completed);
    }, [set.completed]);

    useEffect(() => {
        if (strengthSetWeight !== undefined) {
            setLocalWeight(strengthSetWeight > 0 ? strengthSetWeight.toString() : '');
        }
    }, [strengthSetWeight]);

    useEffect(() => {
        if (strengthSetReps !== undefined) {
            setLocalReps(strengthSetReps ? strengthSetReps.toString() : '');
        }
    }, [strengthSetReps]);

    useEffect(() => {
        if (strengthSetTime !== undefined) {
            setLocalTime(strengthSetTime ? timeToSeconds(strengthSetTime).toString() : '');
        }
    }, [strengthSetTime]);

    useEffect(() => {
        if (cardioSetTime !== undefined) {
            setLocalDuration(timeToSeconds(cardioSetTime).toString());
        }
    }, [cardioSetTime]);

    useEffect(() => {
        if (cardioSetDistanceKm !== undefined) {
            setLocalDistance((cardioSetDistanceKm || 0).toString());
        }
    }, [cardioSetDistanceKm]);

    // Bodyweight auto-fill logic
    useEffect(() => {
        if (
            strengthSet &&
            strengthSetEquipmentType === "Bodyweight" &&
            userBodyweight &&
            userBodyweight > 0 &&
            !previousPerformance &&
            !weightTouched &&
            (!localWeight || parseFloat(localWeight) === 0)
        ) {
            setLocalWeight(String(userBodyweight));
        }
    }, [strengthSet, strengthSetEquipmentType, userBodyweight, previousPerformance, weightTouched, localWeight]);

    // --- Handlers ---

    const handleWeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalWeight(e.target.value);
        setWeightTouched(true);
    }, []);

    const handleRepsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalReps(e.target.value);
        setRepsTouched(true);
    }, []);

    const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalTime(e.target.value);
        setTimeTouched(true);
    }, []);

    const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalDuration(e.target.value);
    }, []);

    const handleDistanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalDistance(e.target.value);
    }, []);

    const handleDelete = useCallback(() => {
        dispatch(deleteSetAction({ workoutExerciseId, setId: set.id }));
    }, [dispatch, workoutExerciseId, set.id]);

    const handleCompletionChange = useCallback((checked: boolean | 'indeterminate') => {
        const isNowCompleted = !!checked;
        setIsCompleted(isNowCompleted);

        if (isStrengthSet(set)) {
            if (isNowCompleted) {
                let weightVal = parseFloat(localWeight);
                let repsVal = parseInt(localReps);
                let timeVal = parseInt(localTime);

                // Auto-fill logic
                if (isNaN(weightVal) && previousPerformance) {
                    weightVal = previousPerformance.weight;
                    setLocalWeight(String(weightVal));
                } else if (isNaN(weightVal)) {
                    weightVal = 0;
                }

                const baseUpdatePayload = {
                    workoutExerciseId,
                    setId: set.id,
                    weight: weightVal,
                    variation: set.variation ?? undefined,
                    equipmentType: set.equipmentType ?? undefined,
                };

                if (isStatic) {
                    if (isNaN(timeVal) && previousPerformance?.time_seconds) {
                        timeVal = previousPerformance.time_seconds;
                        setLocalTime(String(timeVal));
                    }

                    if (weightVal >= 0 && timeVal > 0) {
                        const updatedSetData: StrengthSetUpdatePayload = {
                            ...baseUpdatePayload,
                            reps: null,
                            time: secondsToTime(timeVal),
                        };
                        dispatch(updateSetAction(updatedSetData));
                    } else {
                        setIsCompleted(false);
                        return;
                    }
                } else {
                    if (isNaN(repsVal) && previousPerformance?.reps) {
                        repsVal = previousPerformance.reps;
                        setLocalReps(String(repsVal));
                    }

                    if (weightVal >= 0 && repsVal > 0) {
                        const updatedSetData: StrengthSetUpdatePayload = {
                            ...baseUpdatePayload,
                            reps: repsVal,
                            time: null,
                        };
                        dispatch(updateSetAction(updatedSetData));
                    } else {
                        setIsCompleted(false);
                        return;
                    }
                }
                dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: true }));
            } else {
                dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: false }));
            }
        } else if (isCardioSet(set)) {
            let durationVal = parseInt(localDuration);
            let distanceVal = parseFloat(localDistance);

            if (isNowCompleted) {
                // Auto-fill logic
                if (isNaN(durationVal) && previousPerformance?.time_seconds) {
                    durationVal = previousPerformance.time_seconds;
                    setLocalDuration(String(durationVal));
                }

                if (isNaN(distanceVal) && previousPerformance && 'distance_km' in previousPerformance && previousPerformance.distance_km) {
                    distanceVal = previousPerformance.distance_km;
                    setLocalDistance(String(distanceVal));
                }

                if (durationVal > 0) {
                    dispatch(updateCardioSetAction({
                        workoutExerciseId,
                        setId: set.id,
                        time: secondsToTime(durationVal),
                        distance_km: distanceVal > 0 ? distanceVal : undefined,
                    }));
                    dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: true }));
                } else {
                    setIsCompleted(false);
                }
            } else {
                dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: false }));
            }
        }
    }, [dispatch, workoutExerciseId, set, isStatic, localWeight, localReps, localTime, localDuration, localDistance, previousPerformance]);

    const handleBlur = useCallback((field: 'weight' | 'reps' | 'time' | 'duration' | 'distance') => {
        if (isCompleted) return;

        if (isStrengthSet(set)) {
            const weightVal = parseFloat(localWeight) || 0;
            const repsVal = parseInt(localReps) || 0;
            const timeVal = parseInt(localTime) || 0;

            let shouldUpdate = false;
            const baseUpdatePayload = {
                workoutExerciseId,
                setId: set.id,
                weight: weightVal,
                variation: set.variation ?? undefined,
                equipmentType: set.equipmentType ?? undefined,
            };

            if (isStatic) {
                const updatePayload: StrengthSetUpdatePayload = {
                    ...baseUpdatePayload,
                    reps: null,
                    time: secondsToTime(timeVal),
                };
                if (field === 'weight' && weightVal >= 0 && weightVal !== set.weight) shouldUpdate = true;
                if (field === 'time' && timeVal > 0 && timeVal !== (set.time ? timeToSeconds(set.time) : 0)) shouldUpdate = true;

                if (shouldUpdate) {
                    dispatch(updateSetAction(updatePayload));
                }
            } else {
                const updatePayload: StrengthSetUpdatePayload = {
                    ...baseUpdatePayload,
                    reps: repsVal,
                    time: null,
                };
                if (field === 'weight' && weightVal >= 0 && weightVal !== set.weight) shouldUpdate = true;
                if (field === 'reps' && repsVal > 0 && repsVal !== set.reps) shouldUpdate = true;

                if (shouldUpdate) {
                    dispatch(updateSetAction(updatePayload));
                }
            }
        } else if (isCardioSet(set)) {
            const durationVal = parseInt(localDuration) || 0;
            const distanceVal = parseFloat(localDistance) || 0;

            let shouldUpdate = false;
            if (field === 'duration' && durationVal !== timeToSeconds(set.time)) shouldUpdate = true;
            if (field === 'distance' && distanceVal !== (set.distance_km || 0)) shouldUpdate = true;

            if (shouldUpdate) {
                dispatch(updateCardioSetAction({
                    workoutExerciseId,
                    setId: set.id,
                    time: secondsToTime(durationVal),
                    distance_km: distanceVal > 0 ? distanceVal : undefined,
                }));
            }
        }
    }, [dispatch, workoutExerciseId, set, isStatic, isCompleted, localWeight, localReps, localTime, localDuration, localDistance]);

    // Derived values for indicators
    const showWeightIndicator = !!(
        recommendedPerformance &&
        (recommendedPerformance.action === 'increase_load' || recommendedPerformance.action === 'decrease_load') &&
        !weightTouched &&
        (localWeight === '' || parseFloat(localWeight) === recommendedPerformance.weight)
    );
    const showRepsIndicator = !!(
        !isStatic &&
        recommendedPerformance &&
        recommendedPerformance.action === 'increase_reps' &&
        !repsTouched &&
        localReps === ''
    );
    const showTimeIndicator = !!(
        isStatic &&
        recommendedPerformance &&
        !timeTouched &&
        localTime === ''
    );

    return {
        isCompleted,
        localWeight,
        localReps,
        localTime,
        localDuration,
        localDistance,
        cardioTimerRunning,
        handleWeightChange,
        handleRepsChange,
        handleTimeChange,
        handleDurationChange,
        handleDistanceChange,
        handleCompletionChange,
        handleBlur,
        handleDelete,
        handleStartCardioTimer,
        handleStopCardioTimer,
        showWeightIndicator,
        showRepsIndicator,
        showTimeIndicator
    };
};
