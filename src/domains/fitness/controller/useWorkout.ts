import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import {
    selectCurrentWorkout,
    selectWorkoutStartTime,
    endWorkout as endWorkoutAction,
    clearWorkout,
} from "@/state/workout/workoutSlice";
import { addWorkoutToHistory } from "@/state/history/historySlice";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/lib/integrations/supabase/client';
import { isStrengthSet, isCardioSet, Workout as WorkoutType } from "@/lib/types/workout";
import { saveWorkoutToDb } from '../model/fitnessRepository';

export const useWorkoutPersistence = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const currentWorkout = useAppSelector(selectCurrentWorkout);
    const workoutStartTime = useAppSelector(selectWorkoutStartTime);

    const saveWorkout = async () => {
        if (!currentWorkout) return;

        const hasCompletedSets = currentWorkout.exercises.some(ex =>
            ex.sets.some(set => set.completed)
        );

        if (!hasCompletedSets) {
            // This case should be handled by the UI (e.g., confirmation dialog)
            // but we return early here just in case.
            return { success: false, reason: 'no_completed_sets' };
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            toast({
                title: "Authentication Error",
                description: "Could not verify user. Please log in again.",
                variant: "destructive",
            });
            return { success: false, reason: 'auth_error' };
        }

        const endTime = Date.now();
        const durationInSeconds = workoutStartTime
            ? Math.max(0, Math.round((endTime - workoutStartTime) / 1000))
            : 0;

        // Determine workout type
        const hasStrengthSets = currentWorkout.exercises.some(ex =>
            ex.sets.some(set => set.completed && isStrengthSet(set))
        );
        const hasCardioSets = currentWorkout.exercises.some(ex =>
            ex.sets.some(set => set.completed && isCardioSet(set))
        );

        let workoutType: 'strength' | 'cardio' | 'mixed' = 'strength';
        if (hasStrengthSets && hasCardioSets) {
            workoutType = 'mixed';
        } else if (hasCardioSets) {
            workoutType = 'cardio';
        }

        try {
            const { workoutId, savedWorkoutExercises } = await saveWorkoutToDb(
                user.id,
                currentWorkout,
                durationInSeconds,
                workoutType
            );

            // 4. Update Redux History
            const completedWorkoutForState: WorkoutType = {
                ...currentWorkout,
                id: workoutId,
                completed: true,
                duration: durationInSeconds,
                exercises: currentWorkout.exercises
                    .map(woEx => {
                        const savedWoEx = savedWorkoutExercises.find(swe =>
                            swe.exercise_id === woEx.exerciseId && swe.workout_id === workoutId
                        );
                        if (!savedWoEx) return null;

                        return {
                            ...woEx,
                            id: savedWoEx.id,
                            workoutId: workoutId,
                            sets: woEx.sets
                                .filter(set => set.completed)
                                .map(set => ({ ...set, workoutExerciseId: savedWoEx.id })),
                        };
                    })
                    .filter((woEx): woEx is Exclude<typeof woEx, null> => woEx !== null && woEx.sets.length > 0),
            };

            dispatch(addWorkoutToHistory(completedWorkoutForState));
            dispatch(clearWorkout());
            dispatch(endWorkoutAction());

            toast({
                title: "Workout Saved",
                description: "Your workout has been successfully saved to your profile.",
            });

            navigate('/');
            return { success: true };

        } catch (error: unknown) {
            console.error("Error saving workout:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast({
                title: "Save Error",
                description: `Failed to save workout: ${errorMessage}. Please try again.`,
                variant: "destructive",
            });
            return { success: false, reason: 'error', error };
        }
    };

    const discardWorkout = () => {
        dispatch(endWorkoutAction());
        dispatch(clearWorkout());
        navigate('/');
    };

    return {
        saveWorkout,
        discardWorkout,
        currentWorkout,
    };
};
