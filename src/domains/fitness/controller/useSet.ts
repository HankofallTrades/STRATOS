import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch } from "@/hooks/redux";
import {
    ExerciseSet,
    StrengthSet,
    CardioSet,
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
}

export const useSet = ({
    workoutExerciseId,
    set,
    userBodyweight,
    isStatic,
    previousPerformance
}: UseSetProps) => {
    const dispatch = useAppDispatch();

    // Common State
    const [isCompleted, setIsCompleted] = useState(set.completed);

    // --- Strength Set State ---
    const strengthSet = isStrengthSet(set) ? set : null;
    const [localWeight, setLocalWeight] = useState(() => (strengthSet && strengthSet.weight > 0 ? strengthSet.weight.toString() : ''));
    const [localReps, setLocalReps] = useState(() => (strengthSet && strengthSet.reps ? strengthSet.reps.toString() : ''));
    const [localTime, setLocalTime] = useState(() => (strengthSet && strengthSet.time ? timeToSeconds(strengthSet.time).toString() : ''));

    // Tracking if fields were touched (for performance indicator logic)
    const [weightTouched, setWeightTouched] = useState(false);
    const [repsTouched, setRepsTouched] = useState(false);
    const [timeTouched, setTimeTouched] = useState(false);

    // --- Cardio Set State ---
    const cardioSet = isCardioSet(set) ? set : null;
    const [localDuration, setLocalDuration] = useState(() => (cardioSet ? timeToSeconds(cardioSet.time).toString() : ''));
    const [localDistance, setLocalDistance] = useState(() => (cardioSet ? (cardioSet.distance_km || 0).toString() : ''));

    // --- Sync Effects ---
    useEffect(() => {
        setIsCompleted(set.completed);
    }, [set.completed]);

    useEffect(() => {
        if (strengthSet) {
            setLocalWeight(strengthSet.weight > 0 ? strengthSet.weight.toString() : '');
        }
    }, [strengthSet?.weight]);

    useEffect(() => {
        if (strengthSet) {
            setLocalReps(strengthSet.reps ? strengthSet.reps.toString() : '');
        }
    }, [strengthSet?.reps]);

    useEffect(() => {
        if (strengthSet) {
            setLocalTime(strengthSet.time ? timeToSeconds(strengthSet.time).toString() : '');
        }
    }, [strengthSet?.time]);

    useEffect(() => {
        if (cardioSet) {
            setLocalDuration(timeToSeconds(cardioSet.time).toString());
        }
    }, [cardioSet?.time]);

    useEffect(() => {
        if (cardioSet) {
            setLocalDistance((cardioSet.distance_km || 0).toString());
        }
    }, [cardioSet?.distance_km]);

    // Bodyweight auto-fill logic
    useEffect(() => {
        if (
            strengthSet &&
            strengthSet.equipmentType === "Bodyweight" &&
            userBodyweight &&
            userBodyweight > 0 &&
            !weightTouched &&
            (!localWeight || parseFloat(localWeight) === 0)
        ) {
            setLocalWeight(String(userBodyweight));
        }
    }, [strengthSet?.equipmentType, userBodyweight, weightTouched, localWeight]);

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

                let updatedSetData: any = {
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
                        updatedSetData.reps = null;
                        updatedSetData.time = secondsToTime(timeVal);
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
                        updatedSetData.reps = repsVal;
                        updatedSetData.time = null;
                    } else {
                        setIsCompleted(false);
                        return;
                    }
                }
                dispatch(updateSetAction(updatedSetData));
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
    }, [dispatch, workoutExerciseId, set, isStatic, localWeight, localReps, localTime, localDuration, localDistance]);

    const handleBlur = useCallback((field: 'weight' | 'reps' | 'time' | 'duration' | 'distance') => {
        if (isCompleted) return;

        if (isStrengthSet(set)) {
            const weightVal = parseFloat(localWeight) || 0;
            const repsVal = parseInt(localReps) || 0;
            const timeVal = parseInt(localTime) || 0;

            let shouldUpdate = false;
            let updatePayload: any = {
                workoutExerciseId,
                setId: set.id,
                weight: weightVal,
                variation: set.variation ?? undefined,
                equipmentType: set.equipmentType ?? undefined,
            };

            if (isStatic) {
                updatePayload.reps = null;
                updatePayload.time = secondsToTime(timeVal);
                if (field === 'weight' && weightVal >= 0 && weightVal !== set.weight) shouldUpdate = true;
                if (field === 'time' && timeVal > 0 && timeVal !== (set.time ? timeToSeconds(set.time) : 0)) shouldUpdate = true;
            } else {
                updatePayload.reps = repsVal;
                updatePayload.time = null;
                if (field === 'weight' && weightVal >= 0 && weightVal !== set.weight) shouldUpdate = true;
                if (field === 'reps' && repsVal > 0 && repsVal !== set.reps) shouldUpdate = true;
            }

            if (shouldUpdate) {
                dispatch(updateSetAction(updatePayload));
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
    const showWeightIndicator = !!(previousPerformance && !weightTouched && (localWeight === '' || parseFloat(localWeight) === previousPerformance.weight));
    const showRepsIndicator = !!(!isStatic && previousPerformance && !repsTouched && localReps === '');
    const showTimeIndicator = !!(isStatic && previousPerformance && !timeTouched && localTime === '');

    const previousRepsValue = isStatic ? undefined : previousPerformance?.reps ?? undefined;
    const previousTimeValue = isStatic ? previousPerformance?.time_seconds ?? undefined : undefined;

    return {
        isCompleted,
        localWeight,
        localReps,
        localTime,
        localDuration,
        localDistance,
        handleWeightChange,
        handleRepsChange,
        handleTimeChange,
        handleDurationChange,
        handleDistanceChange,
        handleCompletionChange,
        handleBlur,
        handleDelete,
        showWeightIndicator,
        showRepsIndicator,
        showTimeIndicator,
        previousRepsValue,
        previousTimeValue
    };
};
