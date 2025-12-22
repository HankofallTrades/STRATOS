import React from 'react';
import { formatTime } from '@/lib/utils/timeUtils';
import { Clock, Calendar, Award } from "lucide-react";
import { Barbell } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { Skeleton } from "@/components/core/skeleton";
import { Exercise } from '@/lib/types/workout';
import { usePerformanceOverview } from '../controller/usePerformanceOverview';

interface PerformanceOverviewProps {
    userId: string | undefined;
    exercises: Exercise[];
}

const PerformanceOverviewView: React.FC<PerformanceOverviewProps> = ({ userId, exercises }) => {
    const {
        stats,
        isLoadingStats,
        errorStats,
        averageTime,
        mostCommonExerciseName
    } = usePerformanceOverview(userId, exercises);

    if (isLoadingStats) {
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

    if (errorStats) {
        return <p className="text-red-500 italic text-center mb-8">Error loading performance overview.</p>;
    }

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

export default PerformanceOverviewView;
