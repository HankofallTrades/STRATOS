import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import {
    selectCurrentWorkout,
    selectWorkoutStartTime,
    selectWarmupStartTime,
    clearWorkout,
} from "@/state/workout/workoutSlice";
import { addWorkoutToHistory } from "@/state/history/historySlice";
import { toast } from "@/hooks/use-toast";
import { saveWorkoutToDb } from '../data/fitnessRepository';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/state/auth/AuthProvider';
import { enqueueWorkout } from '../data/offlineQueue';
import {
    buildCompletedWorkoutForHistory,
    finalizeWorkout,
    isLikelyNetworkError,
} from '../data/workoutPersistence';

export const useWorkoutPersistence = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const currentWorkout = useAppSelector(selectCurrentWorkout);
    const workoutStartTime = useAppSelector(selectWorkoutStartTime);
    const warmupStartTime = useAppSelector(selectWarmupStartTime);

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

        if (!user) {
            toast({
                title: "Authentication Error",
                description: "Could not verify user. Please log in again.",
                variant: "destructive",
            });
            return { success: false, reason: 'auth_error' };
        }

        const endTime = Date.now();
        const finalizedWorkout = finalizeWorkout({
            workout: currentWorkout,
            endTime,
            workoutStartTime,
            warmupStartTime,
        });
        const completedWorkoutForState = buildCompletedWorkoutForHistory(finalizedWorkout.workout);

        try {
            const { workoutId } = await saveWorkoutToDb(
                user.id,
                finalizedWorkout.workout,
                finalizedWorkout.durationInSeconds,
                finalizedWorkout.workoutType
            );
            dispatch(
                addWorkoutToHistory(
                    buildCompletedWorkoutForHistory({
                        ...finalizedWorkout.workout,
                        id: workoutId,
                    })
                )
            );
            dispatch(clearWorkout());
            navigate('/', { replace: true });
            await queryClient.invalidateQueries();

            toast({
                title: "Workout Saved",
                description: "Your workout has been successfully saved to your profile.",
            });
            return { success: true };

        } catch (error: unknown) {
            console.error("Error saving workout:", error);

            if (isLikelyNetworkError(error)) {
                enqueueWorkout({
                    id: finalizedWorkout.workout.id,
                    userId: user.id,
                    workout: finalizedWorkout.workout,
                    durationInSeconds: finalizedWorkout.durationInSeconds,
                    workoutType: finalizedWorkout.workoutType,
                    queuedAt: Date.now(),
                });

                dispatch(addWorkoutToHistory(completedWorkoutForState));
                dispatch(clearWorkout());
                navigate('/', { replace: true });

                toast({
                    title: "Saved Offline",
                    description: "Your workout is saved locally and will sync when you're back online.",
                });
                return { success: true, offline: true };
            }

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
        dispatch(clearWorkout());
        navigate('/', { replace: true });
    };

    return {
        saveWorkout,
        discardWorkout,
        currentWorkout,
    };
};
