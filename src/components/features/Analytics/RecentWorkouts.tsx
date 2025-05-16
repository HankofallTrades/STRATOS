import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/integrations/supabase/client';
import { useAuth } from '@/state/auth/AuthProvider';
// import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises'; // Not directly used for this enhancement
import { formatTime } from '@/lib/utils/timeUtils';
import { Clock, Info, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { Skeleton } from "@/components/core/skeleton";
// import { Exercise } from '@/lib/types/workout'; // Keep for exercise name lookup // No longer needed for this specific component

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/core/Dialog/dialog";
import { Button } from "@/components/core/button"; // Assuming button exists
import {
    fetchDetailedWorkoutById,
    DetailedWorkout,
    WorkoutExerciseDetail,
    WorkoutSet
} from '@/lib/integrations/supabase/history'; // Adjusted path

// Define the expected structure of the summary returned by the RPC
// Option 1: Simple summary
interface RecentWorkoutSummary {
    workout_id: string;
    workout_created_at: string; // Changed from workout_date, expects timestamp string
    duration_seconds: number | null;
    total_completed_sets: number; // Calculated in RPC
    exercise_names: string[]; // Get distinct exercise names directly from RPC
}

// Function to call the Supabase RPC for recent workouts
const fetchRecentWorkoutsSummary = async (userId: string, limit: number = 5): Promise<RecentWorkoutSummary[]> => {
    if (!userId) return [];

    // No longer need 'as any' cast for the function name
    const { data, error } = await supabase.rpc('get_recent_workouts_summary', {
        p_user_id: userId,
        p_limit: limit
    });

    if (error) {
        console.error("Error fetching recent workouts summary:", error);
        throw new Error(`Supabase RPC Error: ${error.message}`);
    }

    // No longer need 'as any' cast for result, type should be inferred
    // Validate and map the data
    const summaries = (data ?? []); // Default to empty array if data is null/undefined
    return summaries.map((item: any) => ({
        workout_id: item?.workout_id ?? 'unknown-id',
        workout_created_at: item?.workout_created_at ? String(item.workout_created_at) : new Date().toISOString(), // Use new field, provide fallback ISO string
        duration_seconds: item?.duration_seconds ?? 0,
        total_completed_sets: item?.total_completed_sets ?? 0,
        exercise_names: Array.isArray(item?.exercise_names) ? item.exercise_names.map(String) : [] // Ensure it's an array of strings
    })) as RecentWorkoutSummary[]; // Keep cast to specific interface for safety
};

// Format date (can be simpler if RPC guarantees format)
const formatDate = (dateInput: string): string => {
    try {
        const date = new Date(dateInput); // Directly parse the timestamp string
        if (isNaN(date.getTime())) {
            return "Invalid Date";
        }
        return date.toLocaleDateString(undefined, { // Use locale-sensitive formatting
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        console.error("Error formatting date:", dateInput, e);
        return "Invalid Date";
    }
};

const RecentWorkouts: React.FC = () => {
    const { user } = useAuth();
    const userId = user?.id;

    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Fetch recent workout summaries
    const { data: recentWorkouts = [], isLoading: isLoadingWorkouts, error: errorWorkouts } = useQuery<RecentWorkoutSummary[], Error>({
        queryKey: ['recentWorkoutsSummary', userId],
        queryFn: () => fetchRecentWorkoutsSummary(userId!, 5), // Fetch top 5
        enabled: !!userId,
        staleTime: 1 * 60 * 1000, // Cache for 1 minute
    });

    // Fetch detailed workout data when a workout is selected
    const {
        data: detailedWorkout,
        isLoading: isLoadingDetailedWorkout,
        error: errorDetailedWorkout,
        refetch: refetchDetailedWorkout,
    } = useQuery<DetailedWorkout | null, Error>({
        queryKey: ['detailedWorkout', selectedWorkoutId, userId],
        queryFn: () => {
            if (!selectedWorkoutId || !userId) return Promise.resolve(null);
            return fetchDetailedWorkoutById(userId, selectedWorkoutId);
        },
        enabled: !!selectedWorkoutId && !!userId && isDialogOpen, // Only fetch when dialog is open and IDs are available
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    const handleCardClick = (workoutId: string) => {
        setSelectedWorkoutId(workoutId);
        setIsDialogOpen(true);
        // refetchDetailedWorkout(); // Not strictly needed due to `enabled` but can ensure fresh data
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setSelectedWorkoutId(null); // Clear selected ID when dialog closes
    };

    if (isLoadingWorkouts) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-5 w-3/4 mb-1" />
                            <Skeleton className="h-4 w-1/4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-4 w-1/2 mb-1" />
                            <Skeleton className="h-4 w-1/3" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (errorWorkouts) {
        return <p className="text-red-500 italic text-center">Error loading recent workouts.</p>;
    }

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">Recent Workouts</h2>
            {recentWorkouts.length > 0 ? (
                <div className="space-y-4">
                    {recentWorkouts.map((workout) => (
                        <Card
                            key={workout.workout_id}
                            onClick={() => handleCardClick(workout.workout_id)}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex justify-between">
                                    <span>Workout on {formatDate(workout.workout_created_at)}</span>
                                    <span className="text-sm font-normal flex items-center">
                                        <Clock className="mr-1 h-4 w-4" />
                                        {formatTime(workout.duration_seconds ?? 0)}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {/* Display exercise names directly from RPC */}
                                    {workout.exercise_names.length > 0 ? (
                                        <p className="text-sm font-medium truncate" title={workout.exercise_names.join(', ')}>
                                            Exercises: {workout.exercise_names.join(', ')}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No exercises recorded.</p>
                                    )}
                                    <p className="text-sm text-gray-600">
                                        {workout.total_completed_sets} sets completed
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 italic">No workout history available yet. Complete a workout to see it here!</p>
            )}

            {selectedWorkoutId && (
                <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                    <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Workout Details</DialogTitle>
                            {detailedWorkout && (
                                <DialogDescription>
                                    Details for workout on {formatDate(detailedWorkout.workout_created_at)}.
                                </DialogDescription>
                            )}
                        </DialogHeader>
                        
                        {isLoadingDetailedWorkout && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="ml-2">Loading workout details...</p>
                            </div>
                        )}

                        {errorDetailedWorkout && !isLoadingDetailedWorkout && (
                            <div className="flex flex-col items-center justify-center py-8 text-red-600">
                                <AlertTriangle className="h-8 w-8 mb-2" />
                                <p>Error loading workout details.</p>
                                <p className="text-sm text-red-500">{errorDetailedWorkout.message}</p>
                            </div>
                        )}

                        {!isLoadingDetailedWorkout && !errorDetailedWorkout && detailedWorkout && (
                            <div className="mt-4 space-y-4">
                                {detailedWorkout.exercises.length > 0 ? detailedWorkout.exercises.map(exercise => (
                                    <div key={exercise.exercise_id} className="p-3 border rounded-md bg-slate-50 dark:bg-slate-800">
                                        <h4 className="font-semibold text-md mb-1.5">{exercise.exercise_name}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                            {exercise.completed_sets_count} completed set{exercise.completed_sets_count !== 1 ? 's' : ''}
                                        </p>
                                        {exercise.sets.length > 0 ? (
                                            <ul className="space-y-1 text-sm list-disc list-inside pl-1">
                                                {exercise.sets.filter(set => set.completed).map(set => (
                                                    <li key={set.set_number} className="text-gray-700 dark:text-gray-300">
                                                        Set {set.set_number}:
                                                        {set.reps !== null && set.weight !== null ?
                                                            ` ${set.reps}x${set.weight}` :
                                                            set.time_seconds !== null && set.weight !== null ?
                                                                ` ${set.time_seconds}s x ${set.weight}` :
                                                                set.reps !== null ? // Case for reps without weight (e.g. bodyweight)
                                                                    ` ${set.reps} reps` :
                                                                    set.time_seconds !== null ? // Case for time without weight
                                                                        ` ${set.time_seconds}s` :
                                                                        '' // Fallback, though unlikely given data structure
                                                        }
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">No sets recorded for this exercise.</p>
                                        )}
                                    </div>
                                )) : (
                                    <p className="text-gray-500 italic">No exercises found in this workout.</p>
                                )}
                            </div>
                        )}
                        
                        <DialogFooter className="mt-6">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Close</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default RecentWorkouts; 