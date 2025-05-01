import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import { 
  selectCurrentWorkout, 
  selectWorkoutStartTime,
  endWorkout as endWorkoutAction, 
  clearWorkout 
} from "@/state/workout/workoutSlice";
import { addWorkoutToHistory } from "@/state/history/historySlice";
import { Button } from "@/components/core/button";
import { Plus, Save } from "lucide-react";
import ExerciseSelector from "./ExerciseSelector";
import WorkoutExerciseContainer from "./WorkoutExerciseContainer";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/lib/integrations/supabase/client';
import { Workout } from "@/lib/types/workout";
import { TablesInsert } from '@/lib/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/core/Dialog";

const WorkoutComponent = () => {
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const workoutStartTime = useAppSelector(selectWorkoutStartTime);
  const navigate = useNavigate();
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  if (!currentWorkout) {
    return null;
  }

  const handleDiscardWorkout = () => {
    dispatch(endWorkoutAction());
    dispatch(clearWorkout());
    navigate('/');
    setIsDiscardConfirmOpen(false);
  };

  const handleEndWorkout = async () => {
    const workoutToEnd = currentWorkout;
    
    if (!workoutToEnd) return;

    const hasCompletedSets = workoutToEnd.exercises.some(ex => ex.sets.some(set => set.completed));
    
    if (!hasCompletedSets) {
        setIsDiscardConfirmOpen(true);
        return;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error("Authentication error or user not found:", authError);
        toast({
            title: "Authentication Error",
            description: "Could not verify user. Please log in again.",
            variant: "destructive",
        });
        return;
    }

    const endTime = Date.now();
    const durationInSeconds = workoutStartTime 
      ? Math.max(0, Math.round((endTime - workoutStartTime) / 1000)) 
      : 0;

    const workoutDataForDb: TablesInsert<'workouts'> = {
        user_id: user.id,
        date: workoutToEnd.date,
        duration_seconds: durationInSeconds,
        completed: true,
    };

    try {
        const { data: savedWorkout, error: workoutError } = await supabase
            .from('workouts')
            .insert(workoutDataForDb)
            .select()
            .single();

        if (workoutError || !savedWorkout) {
            throw workoutError || new Error("Failed to save workout record.");
        }

        const workoutId = savedWorkout.id;

        const workoutExercisesDataForDb: TablesInsert<'workout_exercises'>[] = workoutToEnd.exercises
          .filter(exercise => exercise.sets.some(set => set.completed))
          .map((exercise, index) => ({
            workout_id: workoutId,
            exercise_id: exercise.exerciseId,
            order: index + 1,
        }));

        if (workoutExercisesDataForDb.length === 0) {
             console.warn("Workout save aborted: No exercises with completed sets found after filtering.");
             toast({
                title: "Save Issue",
                description: "Could not find exercises with completed sets to save.",
                variant: "destructive",
             });
             dispatch(clearWorkout());
             navigate('/');
             return;
        }

        const { data: savedWorkoutExercises, error: workoutExercisesError } = await supabase
            .from('workout_exercises')
            .insert(workoutExercisesDataForDb)
            .select();

        if (workoutExercisesError || !savedWorkoutExercises || savedWorkoutExercises.length !== workoutExercisesDataForDb.length) {
            throw workoutExercisesError || new Error("Failed to save workout exercises records.");
        }

        const exerciseSetsDataForDb: TablesInsert<'exercise_sets'>[] = [];
        workoutToEnd.exercises.forEach((exercise) => {
            const savedWorkoutExercise = savedWorkoutExercises.find(
                swe => swe.exercise_id === exercise.exerciseId && swe.workout_id === workoutId
            );

            if (!savedWorkoutExercise) {
                console.warn(`Could not find saved workout exercise for exercise ID: ${exercise.exerciseId}`);
                return;
            }

            exercise.sets.forEach((set, index) => {
                 if (set.completed) {
                    exerciseSetsDataForDb.push({
                        workout_exercise_id: savedWorkoutExercise.id,
                        set_number: index + 1,
                        weight: set.weight,
                        reps: set.reps,
                        completed: true,
                        equipment_type: set.equipmentType || null,
                        variation: set.variation || null,
                    });
                 }
            });
        });

        if (exerciseSetsDataForDb.length > 0) {
            const { error: setsError } = await supabase
                .from('exercise_sets')
                .insert(exerciseSetsDataForDb);

            if (setsError) {
                throw setsError;
            }
        } else {
             console.warn("No completed sets found to insert, although workout/workout_exercises were created.");
        }

        const completedWorkoutForState: Workout = {
            ...workoutToEnd,
            id: workoutId,
            completed: true,
            duration: durationInSeconds,
            exercises: workoutToEnd.exercises
                .map(woEx => {
                    const savedWoEx = savedWorkoutExercises.find(swe => swe.exercise_id === woEx.exerciseId && swe.workout_id === workoutId);
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

        toast({
            title: "Workout Saved",
            description: "Your workout has been successfully saved to your profile.",
        });

        dispatch(clearWorkout());
        navigate('/');

    } catch (error: any) {
        console.error("Error saving workout:", error);
        toast({
            title: "Save Error",
            description: `Failed to save workout: ${error.message || 'Unknown error'}. Please try again.`,
            variant: "destructive",
        });
    }
  };

  return (
    <>
      <div className="space-y-6 flex flex-col h-full">
        <div className="flex-grow space-y-6 overflow-y-auto px-1">
          {currentWorkout.exercises.length > 0 ? (
            <AnimatePresence initial={false}>
              {currentWorkout.exercises.map((exercise) => (
                <motion.div
                  key={exercise.id}
                  layout="position"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ type: "spring", stiffness: 250, damping: 30 }}
                >
                  <WorkoutExerciseContainer
                    workoutExercise={exercise}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No exercises added yet</p>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 flex justify-between items-center">
          <div className="w-10"></div> 
          <div className="flex flex-col items-center">
            <ExerciseSelector /> 
          </div>
          <Button
            onClick={handleEndWorkout}
            variant="default" 
            size="icon"
            className="bg-fitnessGreen hover:bg-fitnessGreen/90 rounded-full h-12 w-12"
          >
            <Save size={16} className="text-white" />
          </Button>
        </div>
      </div>

      <Dialog open={isDiscardConfirmOpen} onOpenChange={setIsDiscardConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Workout?</DialogTitle>
            <DialogDescription>
              This workout has no completed sets. Are you sure you want to discard it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-center gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDiscardWorkout}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkoutComponent;
