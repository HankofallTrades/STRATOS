import React from 'react';
import { formatTime } from '@/lib/utils/timeUtils';
import { Clock, Loader2, AlertTriangle, ChevronRight } from "lucide-react";
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
import { useRecentWorkouts } from '../hooks/useRecentWorkouts';

const formatDate = (dateInput: string): string => {
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return "Invalid Date";
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
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
            <section className="stone-surface rounded-[26px] p-5 md:p-6">
                <Skeleton className="h-8 w-48" />
                <div className="mt-5 space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="border-t border-white/6 pt-4 first:border-t-0 first:pt-0">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="mt-3 h-4 w-32" />
                            <Skeleton className="mt-3 h-4 w-full" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (errorWorkouts) {
        return (
            <div className="stone-surface rounded-[26px] p-5 text-center text-sm italic text-red-400 md:p-6">
                Error loading recent workouts.
            </div>
        );
    }

    return (
        <section className="stone-surface rounded-[26px] p-5 md:p-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Recent Workouts</h2>

            {recentWorkouts.length > 0 ? (
                <div className="mt-5 divide-y divide-white/6">
                    {recentWorkouts.map((workout) => (
                        <button
                            key={workout.workout_id}
                            type="button"
                            onClick={() => handleCardClick(workout.workout_id)}
                            className="group flex w-full flex-col gap-3 py-4 text-left transition-colors first:pt-0 last:pb-0 hover:text-foreground"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                                        Workout on {formatDate(workout.workout_created_at)}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {workout.total_completed_sets} sets completed
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4 app-accent-text" />
                                    <span>{formatTime(workout.duration_seconds ?? 0)}</span>
                                    <ChevronRight className="h-4 w-4 text-foreground/28 transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </div>

                            {workout.exercise_names.length > 0 ? (
                                <p className="text-sm text-foreground/80" title={workout.exercise_names.join(', ')}>
                                    Exercises: {workout.exercise_names.join(', ')}
                                </p>
                            ) : (
                                <p className="text-sm italic text-muted-foreground">No exercises recorded.</p>
                            )}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="mt-5 text-sm italic text-muted-foreground">
                    No workout history available yet. Complete a workout to see it here.
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                <DialogContent className="stone-panel max-h-[80vh] overflow-y-auto border-white/10 sm:max-w-lg md:max-w-xl">
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
                            <Loader2 className="h-8 w-8 animate-spin app-accent-text" />
                            <p className="ml-2 text-foreground/82">Loading workout details...</p>
                        </div>
                    )}

                    {errorDetailedWorkout && !isLoadingDetailedWorkout && (
                        <div className="flex flex-col items-center justify-center py-8 text-red-400">
                            <AlertTriangle className="mb-2 h-8 w-8" />
                            <p>Error loading workout details.</p>
                            <p className="text-sm text-red-300">{errorDetailedWorkout.message}</p>
                        </div>
                    )}

                    {!isLoadingDetailedWorkout && !errorDetailedWorkout && detailedWorkout && (
                        <div className="mt-4 space-y-4">
                            {detailedWorkout.exercises.length > 0 ? detailedWorkout.exercises.map(exercise => (
                                <div key={exercise.exercise_id} className="stone-surface rounded-[18px] p-4">
                                    <h4 className="mb-1.5 text-base font-semibold text-foreground">{exercise.exercise_name}</h4>
                                    <p className="mb-2 text-xs text-muted-foreground">
                                        {exercise.completed_sets_count} completed set{exercise.completed_sets_count !== 1 ? 's' : ''}
                                    </p>
                                    {exercise.sets.length > 0 ? (
                                        <ul className="list-inside list-disc space-y-1 pl-1 text-sm">
                                            {exercise.sets.filter(set => set.completed).map((set, idx) => (
                                                <li key={idx} className="text-foreground/78">
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
                                        <p className="text-xs italic text-muted-foreground">No sets recorded for this exercise.</p>
                                    )}
                                </div>
                            )) : (
                                <p className="text-sm italic text-muted-foreground">No exercises found in this workout.</p>
                            )}
                        </div>
                    )}

                    <DialogFooter className="mt-6">
                        <DialogClose asChild>
                            <Button type="button" variant="ghost" className="app-tonal-control rounded-[16px] px-4">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
};

export default RecentWorkoutsView;
