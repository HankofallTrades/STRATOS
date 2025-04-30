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
  const navigate = useNavigate();

  if (!currentWorkout) {
    return null;
  }

  const handleEndWorkout = async () => {
    const workoutToEnd = currentWorkout;
    
    if (!workoutToEnd) return;

    const hasCompletedSets = workoutToEnd.exercises.some(ex => ex.sets.some(set => set.completed));
    
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

    dispatch(endWorkoutAction());

    const workoutToSave = workoutToEnd; 

    const workoutDataForDb: TablesInsert<'workouts'> = {
        user_id: user.id,
        date: workoutToSave.date,
        duration_seconds: workoutToSave.duration,
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

        const workoutExercisesDataForDb: TablesInsert<'workout_exercises'>[] = workoutToSave.exercises
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
        workoutToSave.exercises.forEach((exercise) => {
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
            ...workoutToSave,
            id: workoutId,
            completed: true,
            exercises: workoutToSave.exercises
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
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex-grow space-y-6">
      <div className="flex justify-between items-center">
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
      </div>

      {/* Container for buttons at the bottom */}
      <div className="mt-auto pt-4 flex justify-between items-center">
        {/* Empty div for spacing, pushes End Workout button right */}
        <div className="w-10"></div> 

        {/* Exercise Selector and Add Button (Centered Group) */}
        <div className="flex flex-col items-center">
          <ExerciseSelector /> 
          {/* Removed placeholder Button as ExerciseSelector now renders the button */}
        </div>

        {/* End Workout Button (Right Aligned, Icon Only, Circular) */}
        <Button
          onClick={handleEndWorkout}
          variant="default" 
          size="icon" // Keep icon size
          className="bg-fitnessGreen hover:bg-fitnessGreen/90 rounded-full h-12 w-12" // Increased size from h-10 w-10 to h-12 w-12
        >
          <Save size={16} className="text-white" />
          {/* Removed the text span */}
        </Button>
      </div>
    </div>
  );
};

export default WorkoutComponent;
