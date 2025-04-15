import React, { useState } from 'react';
// Remove Redux imports for exercise list management
// import { useAppSelector, useAppDispatch } from "@/hooks/redux";
// import { selectAllExercises, addExercise as addExerciseAction } from "@/state/exercise/exerciseSlice";
import { useAppDispatch } from "@/hooks/redux"; // Keep dispatch for adding to workout
import { 
    addExerciseToWorkout as addExerciseToWorkoutAction,
    addSetToExercise // Corrected: Import action to add a set
} from "@/state/workout/workoutSlice"; // Keep workout actions
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Add TanStack Query imports
import { fetchExercisesFromDB, createExerciseInDB } from '@/lib/integrations/supabase/exercises'; // Add Supabase function imports
import { Button } from "@/components/core/button";
import { Plus, Search, X } from "lucide-react";
import { Label } from "@/components/core/label";
import { Input } from "@/components/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/core/Dialog";
import { Exercise, WorkoutExercise } from "@/lib/types/workout";
import { EquipmentType } from '@/lib/types/enums';
import { v4 as uuidv4 } from 'uuid';

const ExerciseSelector = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient(); // Get query client instance

  // State for UI control remains the same
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Fetch exercises using useQuery
  const { data: exercises = [], isLoading, error } = useQuery({
    queryKey: ['exercises'],
    queryFn: fetchExercisesFromDB,
  });

  // Mutation for adding a new exercise
  const mutation = useMutation({
    mutationFn: createExerciseInDB,
    onSuccess: () => {
      // Invalidate and refetch the exercises list on success
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setNewExerciseName("");
      setIsAddingNew(false);
    },
    onError: (err) => {
      console.error("Error adding exercise:", err);
      // TODO: Show error to user (e.g., using a toast)
    },
  });

  // Filtering logic remains similar, uses data from useQuery
  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
    if (newExerciseName.trim()) {
      // Use mutation to add the new exercise
      mutation.mutate({ name: newExerciseName.trim() });
    }
  };

  // handleSelectExercise remains mostly the same, uses data from useQuery
  const handleSelectExercise = (exerciseId: string) => {
    const selectedExercise = exercises.find(ex => ex.id === exerciseId);
    if (selectedExercise) {
      const newWorkoutExerciseId = uuidv4(); // Generate ID once
      const workoutExercisePayload: WorkoutExercise = {
        id: newWorkoutExerciseId, // Use generated ID
        exerciseId: selectedExercise.id,
        exercise: selectedExercise,
        equipmentType: selectedExercise.default_equipment_type as EquipmentType | undefined,
        sets: [], // Start with empty sets initially
      };
      // Dispatch to add to the *current workout* state (client state)
      dispatch(addExerciseToWorkoutAction(workoutExercisePayload));

      // Dispatch to add the first default set immediately after
      dispatch(addSetToExercise({ // Corrected: Use the correct action
        workoutExerciseId: newWorkoutExerciseId, // Use the same ID
        exerciseId: selectedExercise.id // Add the missing exerciseId
        // Optionally provide default set values here if the reducer doesn't handle defaults
        // set: { id: uuidv4(), weight: 0, reps: 0, completed: false } 
      }));

      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-fitnessBlue hover:bg-fitnessBlue/90 flex items-center gap-2">
          <Plus size={18} />
          <span>Add Exercise</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Select Exercise</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {isLoading ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-2">Loading exercises...</p>
            ) : error ? (
              <p className="text-center text-red-500 dark:text-red-400 py-2">Error loading exercises.</p>
            ) : filteredExercises.length > 0 ? (
              filteredExercises.map((exercise) => (
                <Button
                  key={exercise.id}
                  variant="outline"
                  onClick={() => handleSelectExercise(exercise.id)}
                  className="w-full justify-start h-auto py-3 px-4 font-normal hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
                >
                  {exercise.name}
                  {/* TODO: Decide if 1RM should come from server or be calculated client-side */}
                  {/* {exercise.oneRepMax && (
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                      1RM: {Math.round(exercise.oneRepMax)} kg
                    </span>
                  )} */}
                </Button>
              ))
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-2">No matching exercises found</p>
            )}
          </div>

          {isAddingNew ? (
            <div className="p-4 border rounded-lg space-y-3 dark:border-gray-700 dark:bg-gray-800">
              <Label htmlFor="new-exercise" className="dark:text-white">New Exercise Name</Label>
              <div className="flex space-x-2">
                <Input
                  id="new-exercise"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="Enter exercise name"
                  className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={mutation.isPending} // Disable input while adding
                />
                <Button
                  variant="default"
                  className="bg-fitnessGreen hover:bg-fitnessGreen/90"
                  onClick={handleAddNew}
                  disabled={!newExerciseName.trim() || mutation.isPending} // Disable button while adding
                >
                  {mutation.isPending ? 'Adding...' : 'Add'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewExerciseName("");
                  }}
                  className="dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
                  disabled={mutation.isPending} // Disable button while adding
                >
                  <X size={16} />
                </Button>
              </div>
              {mutation.isError && (
                <p className="text-sm text-red-500 dark:text-red-400">Failed to add exercise.</p>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
              onClick={() => setIsAddingNew(true)}
            >
              <Plus size={16} className="mr-2" />
              Create New Exercise
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseSelector;
