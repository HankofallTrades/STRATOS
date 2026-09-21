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
    setCompleted as setCompletedAction,
    uncompleteSet as uncompleteSetAction
} from "@/state/workout/workoutSlice";
import {
    bodyweightWeightFill,
    completeSetFromDraft,
    type PreviousSetPerformance,
} from '../data/setCompletion';

interface UseSetProps {
    workoutExerciseId: string;
    set: ExerciseSet;
    userBodyweight?: number | null;
    isStatic: boolean;
    previousPerformance: PreviousSetPerformance | null;
    recommendedPerformance: RecommendedStrengthSetPerformance | null;
    onComplete?: () => void;
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
    recommendedPerformance,
    onComplete,
}: UseSetProps) => {
    const dispatch = useAppDispatch();

    // Completion is not draft state: the set is logged or it isn't, and Set
    // completion decides which. Reading it straight from the workout keeps the
    // checkbox from ever showing a tick the store refused.
    const isCompleted = set.completed;

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
    // The draft holds what the user is typing, so it cannot simply mirror the
    // store. These five stay because the stored set also changes from outside
    // this row — the header's +/- stepper, a swipe-copy from an earlier set,
    // and equipment or variation propagation all write values this row has to
    // pick up. One effect per field on purpose: a combined effect would
    // overwrite a half-typed weight when only the reps changed.
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

    // Bodyweight auto-fill: the rule lives with Set completion, which falls back
    // on it too. Shown in the input up front so the user sees what will be logged.
    useEffect(() => {
        if (!strengthSet) return;
        const fill = bodyweightWeightFill({
            equipmentType: strengthSetEquipmentType,
            userBodyweight,
            previousPerformance,
            weight: localWeight,
            weightTouched,
        });
        if (fill !== null) {
            setLocalWeight(String(fill));
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
        if (!checked) {
            dispatch(uncompleteSetAction({ workoutExerciseId, setId: set.id }));
            return;
        }

        const result = completeSetFromDraft({
            set,
            kind: isCardioSet(set) ? 'cardio' : isStatic ? 'time' : 'strength',
            draft: {
                weight: localWeight,
                reps: localReps,
                time: localTime,
                duration: localDuration,
                distance: localDistance,
            },
            previousPerformance,
            userBodyweight,
            weightTouched,
        });

        // A refusal leaves the row exactly as it was — no tick, no dispatch.
        if (result.status === 'rejected') return;

        const { updates } = result;
        if (updates.weight !== undefined) setLocalWeight(updates.weight);
        if (updates.reps !== undefined) setLocalReps(updates.reps);
        if (updates.time !== undefined) setLocalTime(updates.time);
        if (updates.duration !== undefined) setLocalDuration(updates.duration);
        if (updates.distance !== undefined) setLocalDistance(updates.distance);

        dispatch(setCompletedAction({ workoutExerciseId, completedSet: result.completedSet }));
        onComplete?.();
    }, [dispatch, workoutExerciseId, set, isStatic, localWeight, localReps, localTime, localDuration, localDistance, previousPerformance, userBodyweight, weightTouched, onComplete]);

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
                const parsedRepsVal = parseInt(localReps);
                const isRepsInputEmpty = localReps.trim() === '';
                const nextRepsValue =
                    field === 'reps'
                        ? (Number.isNaN(parsedRepsVal) ? null : parsedRepsVal)
                        : (isRepsInputEmpty ? null : set.reps);
                const updatePayload: StrengthSetUpdatePayload = {
                    ...baseUpdatePayload,
                    reps: nextRepsValue,
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


    const applyRecommendedWeight = useCallback(() => {
        if (!isStrengthSet(set) || isCompleted || !recommendedPerformance) return;
        if (recommendedPerformance.action !== 'increase_load' && recommendedPerformance.action !== 'decrease_load') return;

        const recommendedWeight = recommendedPerformance.weight;
        setLocalWeight(String(recommendedWeight));
        setWeightTouched(true);

        dispatch(updateSetAction({
            workoutExerciseId,
            setId: set.id,
            weight: recommendedWeight,
            reps: set.reps,
            time: set.time ?? null,
            variation: set.variation ?? undefined,
            equipmentType: set.equipmentType ?? undefined,
        }));
    }, [dispatch, workoutExerciseId, set, isCompleted, recommendedPerformance]);
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
        showTimeIndicator,
        applyRecommendedWeight
    };
};
