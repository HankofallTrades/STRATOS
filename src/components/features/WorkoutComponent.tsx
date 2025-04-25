import React from 'react';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import { selectCurrentWorkout, endWorkout as endWorkoutAction } from "@/state/workout/workoutSlice";
import { addWorkoutToHistory } from "@/state/history/historySlice";
import { Button } from "@/components/core/button";
import { Plus, Save } from "lucide-react";
import ExerciseSelector from "./ExerciseSelector";
import WorkoutExerciseContainer from "./WorkoutExerciseContainer";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { ScrollArea } from "@/components/core/scroll-area";
import { supabase } from '@/lib/integrations/supabase/client';
import { Workout, WorkoutExercise, ExerciseSet } from "@/lib/types/workout";
import { TablesInsert } from '@/lib/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';

const WorkoutComponent = () => {
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const workoutTime = useAppSelector((state) => state.workout.workoutTime);
  const navigate = useNavigate();

  if (!currentWorkout) {
    return null;
  }

  const handleEndWorkout = async () => {
    const workoutToPotentiallySave = currentWorkout; 
    
    if (!workoutToPotentiallySave) return;

    const hasCompletedSets = workoutToPotentiallySave.exercises.some(ex => ex.sets.some(set => set.completed));
    
    if (!hasCompletedSets) {
        toast({
            title: "Empty Workout",
            description: "Workout discarded as no sets were completed.",
            variant: "default",
        });
        dispatch(endWorkoutAction());
        navigate('/');
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

    const workoutDataForDb: TablesInsert<'workouts'> = {
        user_id: user.id,
        date: workoutToPotentiallySave.date,
        duration_seconds: Math.round(workoutTime),
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

        const workoutExercisesDataForDb: TablesInsert<'workout_exercises'>[] = workoutToPotentiallySave.exercises
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
        workoutToPotentiallySave.exercises.forEach((exercise) => {
            const savedWorkoutExercise = savedWorkoutExercises.find(
                swe => swe.exercise_id === exercise.exerciseId && swe.workout_id === workoutId
            );

            if (!savedWorkoutExercise) {
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
            ...workoutToPotentiallySave,
            id: workoutId,
            duration: Math.round(workoutTime),
            completed: true,
            exercises: workoutToPotentiallySave.exercises
                .map(woEx => {
                    const savedWoEx = savedWorkoutExercises.find(swe => swe.exercise_id === woEx.exerciseId && swe.workout_id === workoutId);
                    if (!savedWoEx) return null;

                    return {
                        ...woEx,
                        id: savedWoEx.id,
                        workoutId: workoutId,
                        sets: woEx.sets.filter(set => set.completed),
                    };
                })
                .filter(woEx => woEx !== null && woEx.sets.length > 0),
        };

        dispatch(endWorkoutAction());
        dispatch(addWorkoutToHistory(completedWorkoutForState));

        toast({
            title: "Workout Saved",
            description: "Your workout has been successfully saved to your profile.",
        });

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold dark:text-white">Current Workout</h2>
        <Button 
          onClick={handleEndWorkout}
          variant="default"
          className="bg-fitnessGreen hover:bg-fitnessGreen/90 flex items-center gap-2"
        >
          <Save size={16} />
          <span>End Workout</span>
        </Button>
      </div>

      {currentWorkout.exercises.length > 0 ? (
        <div className="space-y-6">
          {currentWorkout.exercises.map((exercise) => (
            <WorkoutExerciseContainer 
              key={exercise.id} 
              workoutExercise={exercise} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No exercises added yet</p>
        </div>
      )}

      <div className="pt-4">
        <ExerciseSelector />
      </div>
    </div>
  );
};

export default WorkoutComponent;
