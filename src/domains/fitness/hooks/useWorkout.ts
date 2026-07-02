import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import {
    selectCurrentWorkout,
    selectWorkoutStartTime,
    selectWarmupStartTime,
    clearWorkout,
} from "@/state/workout/workoutSlice";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/state/auth/AuthProvider';
import { commitFinalizedWorkout } from '../data/workoutCommit';
import { finalizeWorkout } from '../data/workoutPersistence';
import { invalidateWorkoutDependentQueries } from '../data/queryInvalidation';

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

        const finalized = finalizeWorkout({
            workout: currentWorkout,
            endTime: Date.now(),
            workoutStartTime,
            warmupStartTime,
        });

        const outcome = await commitFinalizedWorkout(finalized, {
            userId: user.id,
            dispatch,
        });

        if (outcome.status === "saved") {
            dispatch(clearWorkout());
            navigate('/', { replace: true });
            await invalidateWorkoutDependentQueries(queryClient, user.id);
            toast({
                title: "Workout Saved",
                description: "Your workout has been successfully saved to your profile.",
            });
            return { success: true };
        }

        if (outcome.status === "queued") {
            dispatch(clearWorkout());
            navigate('/', { replace: true });
            toast({
                title: "Saved Offline",
                description: "Your workout is saved locally and will sync when you're back online.",
            });
            return { success: true, offline: true };
        }

        const errorMessage =
            outcome.error instanceof Error ? outcome.error.message : 'Unknown error';
        toast({
            title: "Save Error",
            description: `Failed to save workout: ${errorMessage}. Please try again.`,
            variant: "destructive",
        });
        return { success: false, reason: 'error', error: outcome.error };
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
