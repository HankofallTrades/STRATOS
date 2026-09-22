import { useNavigate } from 'react-router-dom';
import { useStore } from 'react-redux';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import type { RootState } from "@/state/store";
import {
    selectCurrentWorkout,
    selectWorkoutStartTime,
    selectWarmupStartTime,
    clearWorkout,
    workoutFinished,
} from "@/state/workout/workoutSlice";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/state/auth/AuthProvider';
import { reconciledWorkoutForFinish } from '../data/activityJournalReplay';
import { commitFinalizedWorkout } from '../data/workoutCommit';
import { finalizeWorkout } from '../data/workoutPersistence';
import { invalidateWorkoutDependentQueries } from '../data/queryInvalidation';

export const useWorkoutPersistence = () => {
    const navigate = useNavigate();
    const store = useStore<RootState>();
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const currentWorkout = useAppSelector(selectCurrentWorkout);
    const workoutStartTime = useAppSelector(selectWorkoutStartTime);
    const warmupStartTime = useAppSelector(selectWarmupStartTime);

    const saveWorkout = async () => {
        if (!currentWorkout) return;

        // Finish is tappable while a journal replay is in flight, and the last
        // set of a session is often the one logged from the lock screen. The
        // workout is re-read here because waiting for that replay is exactly
        // what makes the rendered one stale (I-39).
        const workout = await reconciledWorkoutForFinish({
            dispatch,
            getState: store.getState,
        });
        if (!workout) return;

        const hasCompletedSets = workout.exercises.some(ex =>
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
            workout,
            endTime: Date.now(),
            workoutStartTime,
            warmupStartTime,
        });

        const outcome = await commitFinalizedWorkout(finalized, {
            userId: user.id,
            dispatch,
        });

        if (outcome.status === "saved") {
            dispatch(workoutFinished(workout.id));
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
            dispatch(workoutFinished(workout.id));
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
