import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/integrations/supabase/client'; // Ensure client is exported
import { useAuth } from '@/state/auth/AuthProvider';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import { formatTime } from '@/lib/utils/timeUtils';
import { Clock, Calendar, Award } from "lucide-react";
import { Barbell } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { Skeleton } from "@/components/core/skeleton"; // For loading state

// Define the expected shape of the data returned by the RPC function
interface PerformanceStats {
    total_workouts: number;
    total_duration_seconds: number;
    most_common_exercise_id: string | null;
    // Note: Consider adding most_common_exercise_name directly to the RPC for efficiency
}

// Function to call the Supabase RPC
const fetchPerformanceStats = async (userId: string): Promise<PerformanceStats> => {
    if (!userId) {
        // Return default/empty state if no user ID
        return { total_workouts: 0, total_duration_seconds: 0, most_common_exercise_id: null };
    }
    // No longer need 'as any' cast for the function name
    const { data, error } = await supabase.rpc('get_user_performance_stats', {
        p_user_id: userId,
    });

    if (error) {
        console.error("Error fetching performance stats:", error);
        throw new Error(`Supabase RPC Error: ${error.message}`);
    }

    // No longer need 'as any' cast for the result data, type should be inferred correctly
    // Assuming the RPC return type is correctly defined as returning a single object or array
    const stats = Array.isArray(data) ? data[0] : data;
    return {
      total_workouts: stats?.total_workouts ?? 0,
      total_duration_seconds: stats?.total_duration_seconds ?? 0,
      most_common_exercise_id: stats?.most_common_exercise_id ?? null,
    };
};


const PerformanceOverview: React.FC = () => {
    const { user } = useAuth();
    const userId = user?.id;

    // Fetch performance stats using the RPC function
    const { data: stats, isLoading: isLoadingStats, error: errorStats } = useQuery<PerformanceStats, Error>({
        queryKey: ['performanceStats', userId],
        queryFn: () => fetchPerformanceStats(userId!), // userId should exist if component renders
        enabled: !!userId, // Only run query when userId is available
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    // Fetch all exercises to find the name of the most common one
    // This could potentially be optimized by adding the name to the RPC result
    const { data: exercises = [], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
        queryKey: ['exercises'], // Reuse the key if appropriate or make more specific
        queryFn: fetchExercisesFromDB,
        staleTime: Infinity, // Exercises list rarely changes
    });

    // Calculate derived values
    const averageTime = useMemo(() => {
        if (!stats || stats.total_workouts === 0) return 0;
        return Math.round(stats.total_duration_seconds / stats.total_workouts);
    }, [stats]);

    const mostCommonExerciseName = useMemo(() => {
        if (isLoadingExercises || isLoadingStats || !stats?.most_common_exercise_id || exercises.length === 0) return null;
        const found = exercises.find(ex => ex.id === stats.most_common_exercise_id);
        return found?.name ?? "Unknown"; // Handle case where ID exists but exercise doesn't (e.g., deleted)
    }, [exercises, stats?.most_common_exercise_id, isLoadingExercises, isLoadingStats]);

    // Handle loading state for all cards
    if (isLoadingStats || isLoadingExercises) {
      return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                   <Card key={i}>
                       <CardHeader className="pb-2">
                           <Skeleton className="h-5 w-3/4 mb-1" />
                       </CardHeader>
                       <CardContent>
                           <Skeleton className="h-8 w-1/2" />
                       </CardContent>
                   </Card>
              ))}
          </div>
      );
    }
    
    // Handle error state (basic example)
    if (errorStats || errorExercises) {
        return <p className="text-red-500 italic text-center mb-8">Error loading performance overview.</p>;
    }
    
    // Display fetched data
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-fitnessBlue" />
                        Total Workouts
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{stats?.total_workouts ?? 0}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-fitnessBlue" />
                        Total Time
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{formatTime(stats?.total_duration_seconds ?? 0)}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                        <Barbell className="mr-2 h-4 w-4 text-fitnessBlue" />
                        Avg. Duration
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{formatTime(averageTime)}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                        <Award className="mr-2 h-4 w-4 text-fitnessBlue" />
                        Top Exercise
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xl font-bold truncate" title={mostCommonExerciseName ?? "None"}>
                        {mostCommonExerciseName ?? "None"}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default PerformanceOverview; 