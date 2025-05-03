import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/integrations/supabase/client';
import { useAuth } from '@/state/auth/AuthProvider';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import { formatTime } from '@/lib/utils/timeUtils';
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { Skeleton } from "@/components/core/skeleton";
import { Exercise } from '@/lib/types/workout'; // Keep for exercise name lookup

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

    // Fetch recent workout summaries
    const { data: recentWorkouts = [], isLoading: isLoadingWorkouts, error: errorWorkouts } = useQuery<RecentWorkoutSummary[], Error>({
        queryKey: ['recentWorkoutsSummary', userId],
        queryFn: () => fetchRecentWorkoutsSummary(userId!, 5), // Fetch top 5
        enabled: !!userId,
        staleTime: 1 * 60 * 1000, // Cache for 1 minute
    });

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
                        <Card key={workout.workout_id}>
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
        </div>
    );
};

export default RecentWorkouts; 