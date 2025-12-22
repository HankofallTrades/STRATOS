import React from 'react';
import { formatTime } from '@/lib/utils/timeUtils';
import { Clock, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { Skeleton } from "@/components/core/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/core/Dialog/dialog";
import { Button } from "@/components/core/button";
import { useRecentWorkouts } from '../controller/useRecentWorkouts';

const formatDate = (dateInput: string): string => {
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return "Invalid Date";
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return "Invalid Date";
    }
};

const RecentWorkoutsView: React.FC<{ userId: string | undefined }> = ({ userId }) => {
    const {
        recentWorkouts,
        isLoadingWorkouts,
        errorWorkouts,
        isDialogOpen,
        detailedWorkout,
        isLoadingDetailedWorkout,
        errorDetailedWorkout,
        handleCardClick,
        handleDialogClose
    } = useRecentWorkouts(userId);

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
                                            {exercise.sets.filter(set => set.completed).map((set, idx) => (
                                                <li key={idx} className="text-gray-700 dark:text-gray-300">
                                                    Set {set.set_number}:
                                                    {set.reps !== null && set.weight !== null ?
                                                        ` ${set.reps}x${set.weight}` :
                                                        set.time_seconds !== null && set.weight !== null ?
                                                            ` ${set.time_seconds}s x ${set.weight}` :
                                                            set.reps !== null ?
                                                                ` ${set.reps} reps` :
                                                                set.time_seconds !== null ?
                                                                    ` ${set.time_seconds}s` :
                                                                    ''
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
        </div>
    );
};

export default RecentWorkoutsView;
