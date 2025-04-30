import React, { useState, useRef, useEffect } from 'react';
// Remove Redux imports for exercise list management
// import { useAppSelector, useAppDispatch } from "@/hooks/redux";
// import { selectAllExercises, addExercise as addExerciseAction } from "@/state/exercise/exerciseSlice";
import { useAppDispatch } from "@/hooks/redux"; // Keep dispatch for adding to workout
import { 
    addExerciseToWorkout as addExerciseToWorkoutAction,
    addSetToExercise // Corrected: Import action to add a set
} from "@/state/workout/workoutSlice"; // Keep workout actions
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Add TanStack Query imports
import { fetchExercisesFromDB, createExerciseInDB, deleteExerciseFromDB, hideExerciseForUser } from '@/lib/integrations/supabase/exercises'; // Add Supabase function imports
import { fetchLastConfigForExercise, fetchLastWorkoutExerciseInstanceFromDB } from '@/lib/integrations/supabase/history'; // Import the new function
import { Button } from "@/components/core/button";
import { Plus, Search, X, Trash2 } from "lucide-react";
import { Label } from "@/components/core/label";
import { Input } from "@/components/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/core/Dialog";
import { Exercise, WorkoutExercise } from "@/lib/types/workout";
import { EquipmentType, EquipmentTypeEnum } from '@/lib/types/enums';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/components/core/Toast/use-toast";
import { useAuth } from '@/state/auth/AuthProvider';

const LONG_PRESS_DURATION = 500; // 500ms for long press

const ExerciseSelector = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient(); // Get query client instance
  const { toast } = useToast(); // Initialize toast
  const { user } = useAuth(); // Get the authenticated user

  // State for UI control remains the same
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  // New State for Deletion
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch exercises using useQuery
  const { data: exercises = [], isLoading, error } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => user ? fetchExercisesFromDB() : [], // Call without arguments
    refetchOnWindowFocus: false, 
    enabled: !!user, // Only fetch if user is loaded
  });

  // Modify handleSelectExercise to accept the full Exercise object and make it async
  const handleSelectExercise = async (selectedExercise: Exercise) => { // Make async
    const newWorkoutExerciseId = uuidv4(); // Generate ID once
    let lastConfig = { equipmentType: null, variation: null }; // Default last config

    // Fetch last used config if user is logged in
    if (user?.id && selectedExercise.id) {
      try {
        // Use fetchQuery to get the last configuration
        const fetchedConfig = await queryClient.fetchQuery({
          queryKey: ['lastExerciseConfig', user.id, selectedExercise.id],
          queryFn: () => fetchLastConfigForExercise(user.id, selectedExercise.id),
          staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        });
        if (fetchedConfig) {
          lastConfig = fetchedConfig;
        }
        console.log(`Last config for ${selectedExercise.name}:`, lastConfig);
      } catch (error) {
        console.error("Error fetching last exercise config:", error);
        // Non-critical, proceed with defaults
      }
    }

    // Determine equipment type: last used > exercise default > fallback (BB)
    const equipmentType = 
      lastConfig.equipmentType as EquipmentType ?? // Use last used if available
      selectedExercise.default_equipment_type as EquipmentType ?? // Else use exercise default
      EquipmentTypeEnum.BB; // Else fallback to Barbell

    // Determine variation: last used > fallback ('Standard')
    const variation = lastConfig.variation ?? 'Standard';

    // Prefetch historical data for the determined config
    if (user?.id && selectedExercise.id) {
      queryClient.prefetchQuery({
        queryKey: ['lastPerformance', user.id, selectedExercise.id, equipmentType, variation],
        queryFn: () => fetchLastWorkoutExerciseInstanceFromDB(user.id!, selectedExercise.id, equipmentType, variation),
        staleTime: 5 * 60 * 1000, // Keep prefetched data fresh for 5 mins
      }).catch(error => {
          console.error("Error prefetching last performance data:", error); 
          // Log error but don't block adding the exercise
      });
    }

    // Create the payload with potentially fetched config
    const workoutExercisePayload: WorkoutExercise = {
      id: newWorkoutExerciseId, // Use generated ID
      exerciseId: selectedExercise.id,
      exercise: selectedExercise,
      equipmentType: equipmentType, // Use determined equipment type
      variation: variation,         // Use determined variation
      sets: [], // Start with empty sets initially
    };

    // Dispatch to add to the *current workout* state (client state)
    dispatch(addExerciseToWorkoutAction(workoutExercisePayload));

    // Dispatch to add the first default set immediately after
    dispatch(addSetToExercise({ // Corrected: Use the correct action
      workoutExerciseId: newWorkoutExerciseId, // Use the same ID
      exerciseId: selectedExercise.id // Add the missing exerciseId
    }));

    // Reset UI state
    setOpen(false); // Close the dialog after selection
    setSearchQuery(""); // Reset search query
    setIsAddingNew(false); // Reset adding state
    setNewExerciseName(""); // Reset new exercise name
  };

  // Mutation for adding a new exercise
  const mutation = useMutation({
    mutationFn: createExerciseInDB,
    onSuccess: (newExercise: Exercise) => { // Receive the newly created exercise object
      // Invalidate and refetch the exercises list in the background
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      
      // Automatically select the newly created exercise
      // Ensure newExercise has an ID before selecting
      if (newExercise && newExercise.id) {
        handleSelectExercise(newExercise);
      } else {
        // Handle case where newExercise might not be returned as expected
        console.warn("New exercise created, but couldn't auto-select. Refetching list.");
        // Reset state even if auto-select fails for some reason
         setNewExerciseName("");
         setIsAddingNew(false);
         setOpen(false); // Close dialog anyway
      }
      // No need to reset state here, handleSelectExercise does it now
    },
    onError: (err) => {
      console.error("Error adding exercise:", err);
      toast({ // Show error toast
        title: "Error",
        description: "Failed to add exercise. Please try again.",
        variant: "destructive",
      });
    },
  });

  // --- New Mutation for Deleting an Exercise ---
  const deleteExerciseMutation = useMutation({
    mutationFn: deleteExerciseFromDB,
    onSuccess: (_, deletedExerciseId) => { // First arg is result (void), second is variable passed to mutate (exerciseId)
      toast({
        title: "Success",
        description: "Custom exercise deleted permanently.",
      });

      // Manually update the 'exercises' query cache
      queryClient.setQueryData(['exercises'], (oldData: Exercise[] | undefined) => {
        if (!oldData) return []; // Return empty array if cache is empty
        // Filter out the deleted exercise by its ID
        return oldData.filter(exercise => exercise.id !== deletedExerciseId);
      });

      // No longer strictly needed as setQueryData updates the cache, but can keep for background sync
      // queryClient.invalidateQueries({ queryKey: ['exercises'] });

      setIsConfirmDeleteDialogOpen(false); // Close confirmation dialog
      setExerciseToDelete(null); // Clear selected exercise for deletion
    },
    onError: (err: Error, deletedExerciseId) => {
      console.error(`Error deleting exercise ${deletedExerciseId}:`, err);
      toast({
        title: "Error",
        description: `Failed to delete exercise: ${err.message || 'Please try again.'}`,
        variant: "destructive",
      });
      setIsConfirmDeleteDialogOpen(false); // Close confirmation dialog even on error
      setExerciseToDelete(null);
    },
  });

  // --- New Mutation for Hiding an Exercise ---
  const hideExerciseMutation = useMutation({
    // Arguments for mutationFn: { userId: string, exerciseId: string }
    mutationFn: (vars: { userId: string, exerciseId: string }) => hideExerciseForUser(vars.userId, vars.exerciseId),
    onSuccess: (_, vars) => { // Second arg contains variables passed to mutate
      toast({
        title: "Success",
        description: "Exercise removed from your list.",
      });
      // Update cache (remove the hidden exercise from the list)
      queryClient.setQueryData(['exercises'], (oldData: Exercise[] | undefined) =>
        oldData?.filter(exercise => exercise.id !== vars.exerciseId) || []
      );
      setIsConfirmDeleteDialogOpen(false);
      setExerciseToDelete(null);
    },
    onError: (err: Error, vars) => {
      console.error(`Error hiding exercise ${vars.exerciseId} for user ${vars.userId}:`, err);
      toast({ title: "Error", description: `Failed to remove exercise: ${err.message}`, variant: "destructive" });
      setIsConfirmDeleteDialogOpen(false);
      setExerciseToDelete(null);
    },
  });

  // --- Long Press Handlers ---
  const handlePointerDown = (exercise: Exercise) => {
    // Clear any existing timer
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
    }
    // Start a new timer
    longPressTimerRef.current = setTimeout(() => {
      setExerciseToDelete(exercise);
      setIsConfirmDeleteDialogOpen(true);
      longPressTimerRef.current = null; // Clear timer ref after triggering
    }, LONG_PRESS_DURATION);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // --- Updated Confirmation Handler ---
  const handleRemoveConfirm = () => {
    if (!exerciseToDelete || !user) {
      console.error("Cannot remove exercise: No exercise selected or user not logged in.");
      toast({ title: "Error", description: "Could not remove exercise. Please try again.", variant: "destructive" });
      return;
    }

    // --- Add Logging --- 
    console.log("Attempting to remove exercise:", exerciseToDelete);
    console.log("Exercise created_by_user_id:", exerciseToDelete.created_by_user_id);
    console.log("Current user ID:", user.id);
    // --- End Logging ---

    // Check if it's a user-created exercise
    if (exerciseToDelete.created_by_user_id === user.id) {
      // User created: Permanently delete
      console.log(`Deleting user-created exercise: ${exerciseToDelete.id}`);
      deleteExerciseMutation.mutate(exerciseToDelete.id);
    } else if (exerciseToDelete.created_by_user_id === null) {
      // Predefined exercise: Hide it for the user
      console.log(`Hiding predefined exercise: ${exerciseToDelete.id} for user: ${user.id}`);
      hideExerciseMutation.mutate({ userId: user.id, exerciseId: exerciseToDelete.id });
    } else {
      // Edge case: Exercise created by *another* user (shouldn't typically be listed due to RLS/fetch logic, but handle defensively)
      console.warn(`Attempted to remove exercise ${exerciseToDelete.id} created by another user.`);
      toast({ title: "Error", description: "You cannot remove exercises created by others.", variant: "destructive" });
      setIsConfirmDeleteDialogOpen(false); // Close dialog
      setExerciseToDelete(null);
    }
  };

  // Filtering logic remains similar, uses data from useQuery
  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
    if (newExerciseName.trim()) {
      // Use mutation to add the new exercise
      // Pass only the name, assuming createExerciseInDB handles defaults
      mutation.mutate({ name: newExerciseName.trim() }); 
    }
  };

  // Reset search and add state when dialog closes
  useEffect(() => {
    if (!open) {
        setSearchQuery("");
        setIsAddingNew(false);
        setNewExerciseName("");
        // Also clear any potential long press state if main dialog is closed
        clearLongPressTimer();
        setIsConfirmDeleteDialogOpen(false); // Ensure delete dialog is closed too
        setExerciseToDelete(null);
    }
  }, [open]);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []);

  // Determine if any mutation is pending
  const isActionPending = deleteExerciseMutation.isPending || hideExerciseMutation.isPending;

  return (
    // Added wrapper div for right alignment
    <div className="flex justify-end">
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
          {/* Modified Button to show text and keep blue color */}
          <Button 
            variant="default" // Changed from outline to default to better match original request's blue
            className="bg-fitnessBlue hover:bg-fitnessBlue/90 text-white" // Ensured blue background and white text
          > 
            <Plus size={16} className="mr-2" /> {/* Keep icon, adjust size if needed */}
            Add Exercise {/* Added text */}
        </Button>
      </DialogTrigger>
      {/* Add onOpenAutoFocus to prevent default focus behavior */}
      <DialogContent 
        className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700"
        onOpenAutoFocus={(e) => e.preventDefault()} 
        // Prevent closing main dialog when interacting with delete confirmation
        onInteractOutside={(e) => {
           if (isConfirmDeleteDialogOpen) {
             e.preventDefault();
           }
        }}
      >
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
              // Removed autoFocus if it was present, onOpenAutoFocus handles it
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
                  // Pass the full exercise object to handleSelectExercise
                  onClick={() => handleSelectExercise(exercise)} 
                  // Add pointer events for long-press detection
                  onPointerDown={() => handlePointerDown(exercise)}
                  onPointerUp={clearLongPressTimer} // Clear timer on release
                  onPointerLeave={clearLongPressTimer} // Clear timer if pointer leaves button
                  // Add touch equivalents for mobile long press
                  onTouchStart={() => handlePointerDown(exercise)}
                  onTouchEnd={clearLongPressTimer}
                  onTouchCancel={clearLongPressTimer}
                  // Add right-click handler
                  onContextMenu={(e) => {
                    e.preventDefault(); // Prevent default context menu
                    setExerciseToDelete(exercise);
                    setIsConfirmDeleteDialogOpen(true);
                  }}
                  // Add select-none to prevent text selection during long press
                  className="w-full justify-start h-auto py-3 px-4 font-normal hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 select-none"
                  // Keep existing inline style for touch callout prevention
                  style={{ WebkitTouchCallout: 'none'}}
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
                  disabled={!newExerciseName.trim() || mutation.isPending || isActionPending} // Disable if adding or removing
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
                  disabled={mutation.isPending || isActionPending} // Disable if adding or removing
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
              // Disable "Create New" if adding OR removing is in progress
              disabled={mutation.isPending || isActionPending}
            >
              <Plus size={16} className="mr-2" />
              Create New Exercise
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* --- Updated Confirmation Dialog --- */}
    <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
      <DialogContent className="sm:max-w-xs dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          {/* Changed title to "Remove" */}
          <DialogTitle className="dark:text-white">Remove Exercise</DialogTitle>
          <DialogDescription className="dark:text-gray-300 pt-2">
            {/* Updated description based on type */}
            {exerciseToDelete?.created_by_user_id === user?.id
              ? `Permanently delete "${exerciseToDelete?.name}"? This action cannot be undone.`
              : `Remove "${exerciseToDelete?.name}" from your list? You can add it back later.`
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => setIsConfirmDeleteDialogOpen(false)}
            disabled={isActionPending} // Check combined pending state
            className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            // Changed onClick handler
            onClick={handleRemoveConfirm}
            // Check combined pending state
            disabled={isActionPending}
          >
            {/* Updated button text and loading state */}
            {isActionPending ? 'Removing...' : <><Trash2 size={16} className="mr-2" /> Remove</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div> // End wrapper div
  );
};

export default ExerciseSelector;
