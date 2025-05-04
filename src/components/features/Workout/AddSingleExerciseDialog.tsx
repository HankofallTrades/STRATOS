import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  // DialogClose, // No longer using DialogClose directly with button
} from "@/components/core/Dialog";
import { Button } from "@/components/core/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/core/popover";
import { supabase } from '@/lib/integrations/supabase/client';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises'; // Assuming this function exists
import { useAuth } from '@/state/auth/AuthProvider'; // Assuming this hook exists
import { useToast } from "@/hooks/use-toast";
import { Exercise } from "@/lib/types/workout";
import { Tables, TablesInsert } from '@/lib/integrations/supabase/types';
import { Loader2, Plus, Minus } from 'lucide-react'; // For loading state and Plus/Minus icons
import { cn } from "@/lib/utils/cn"; // For conditional class names

// --- Constants ---
const EQUIPMENT_TYPES = ['Barbell', 'Dumbbell', 'Machine', 'Kettlebell', 'Bodyweight', 'Other'];
const DEFAULT_VARIATION = 'Standard'; // Use consistent default naming

// --- Interfaces ---
interface AddSingleExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLogData?: LatestSingleLogData | null; // Add optional prop
}

// Define the structure needed for the mutation
interface NewSingleLogData {
  exercise_id: string;
  reps: number;
  weight: number;
  equipment_type: string | null;
  variation: string | null;
}

// Assuming Profile type structure
type Profile = Tables<'profiles'>;
// Assuming Variation type structure
type ExerciseVariation = Tables<'exercise_variations'>;
// Assuming Exercise Set type structure
type ExerciseSet = Tables<'exercise_sets'>;

// Interface for the latest single log data passed as prop
// (Can be defined here or imported if defined elsewhere)
interface LatestSingleLogData extends Tables<'exercise_sets'> {
    exercise_id: string;
}

const AddSingleExerciseDialog: React.FC<AddSingleExerciseDialogProps> = ({ open, onOpenChange, defaultLogData }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(() => defaultLogData?.exercise_id ?? '');
  const [reps, setReps] = useState<string>(() => defaultLogData?.reps?.toString() ?? '');
  const [weight, setWeight] = useState<string>(() => defaultLogData?.weight?.toString() ?? '');
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(() => defaultLogData?.equipment_type ?? null);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(() => defaultLogData?.variation ?? null);
  const [equipmentPopoverOpen, setEquipmentPopoverOpen] = useState(false);
  const [variationPopoverOpen, setVariationPopoverOpen] = useState(false);

  // Fetch exercises query
  const { data: exercises = [], isLoading: isLoadingExercises, error: errorExercises } = useQuery<Exercise[]>({
    queryKey: ['exercises'],
    queryFn: fetchExercisesFromDB,
    staleTime: Infinity, // Exercises list doesn't change often
    enabled: open, // Only fetch when the dialog is open
  });

  // Fetch User Profile (for potential bodyweight autofill - currently unused but fetched)
  const { data: profile } = useQuery<Profile | null>({
      queryKey: ['profile', user?.id],
      queryFn: async () => {
          if (!user?.id) return null;
          const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
          if (error) throw error;
          return data;
      },
      enabled: !!user?.id && open,
      staleTime: 1000 * 60 * 5, // Refetch profile occasionally
  });

  // Fetch Variations for selected exercise
  const { data: variations = [], isLoading: isLoadingVariations } = useQuery<ExerciseVariation[]>({
      queryKey: ['exerciseVariations', selectedExerciseId],
      queryFn: async () => {
          const { data, error } = await supabase
              .from('exercise_variations')
              .select('*')
              .eq('exercise_id', selectedExerciseId);
          if (error) throw error;
          return data ?? [];
      },
      enabled: !!selectedExerciseId && open, // Only fetch if an exercise is selected and dialog is open
  });

  // Fetch Last Set for selected exercise
  const { data: lastSet, isLoading: isLoadingLastSet } = useQuery<ExerciseSet | null>({
      queryKey: ['lastSet', user?.id, selectedExerciseId],
      queryFn: async () => {
          if (!user?.id || !selectedExerciseId) return null;
          const { data, error } = await supabase
              .from('exercise_sets')
              .select('*, workout_exercises!inner(workout_id, user_id:workouts!inner(user_id))') // Fetch through relations to ensure user match
              .eq('workout_exercises.workouts.user_id', user.id)
              .eq('workout_exercises.exercise_id', selectedExerciseId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(); // Use maybeSingle to return null if no record found
              
          if (error) {
            // It's okay if no last set is found, don't throw error
            if (error.code === 'PGRST116') { // code for "relation doesn't exist" or similar when no match
                 console.log("No previous set found for this exercise.");
                 return null;
            } 
            console.error("Error fetching last set:", error);
            // Optionally show a toast, but might be noisy
            // toast({ title: "Error", description: "Could not fetch previous set data.", variant: "destructive" });
            return null; // Return null on error
          }
          return data;
      },
      enabled: !!user?.id && !!selectedExerciseId && open, // Fetch only when user and exercise are selected
      staleTime: 1000 * 60, // Cache for 1 minute
  });

  // Memoization
  const selectedExercise = useMemo(() => {
    return exercises.find(ex => ex.id === selectedExerciseId);
  }, [exercises, selectedExerciseId]);

  // Reset form when dialog opens/closes (overrides initial state if needed)
  useEffect(() => {
    if (open) {
        // When opening, prioritize defaultLogData for initial state
        setSelectedExerciseId(defaultLogData?.exercise_id ?? '');
        setReps(defaultLogData?.reps?.toString() ?? '');
        setWeight(defaultLogData?.weight?.toString() ?? '');
        setSelectedEquipment(defaultLogData?.equipment_type ?? null);
        setSelectedVariation(defaultLogData?.variation ?? null);
    } else {
        // When closing, clear everything
        setSelectedExerciseId('');
        setReps('');
        setWeight('');
        setSelectedEquipment(null);
        setSelectedVariation(null);
        // Optional: Reset react-query caches related to this dialog if desired
        queryClient.removeQueries({ queryKey: ['lastSet', user?.id, selectedExerciseId], exact: true });
        queryClient.removeQueries({ queryKey: ['exerciseVariations', selectedExerciseId], exact: true });
    }
  // Add queryClient and user?.id to dependencies if using resetQueries
  // Also add defaultLogData to reset when it changes (might cause re-renders if object ref changes)
  }, [open, defaultLogData, queryClient, user?.id]); 

  // Pre-fill form based on *manually changed* selected exercise and last set data
  // This effect now primarily handles updates AFTER the initial load or manual exercise changes
  useEffect(() => {
    // Only run if the exercise ID was *changed* after initial load
    // or if defaultLogData wasn't present initially.
    // Avoid running if selectedExerciseId matches the defaultLogData exercise_id initially.
    const isInitialDefault = defaultLogData?.exercise_id && selectedExerciseId === defaultLogData.exercise_id;
    
    if (!isInitialDefault && selectedExercise && lastSet !== undefined) { 
        // Prioritize last set data *for the currently selected exercise*
        setWeight(lastSet?.weight?.toString() ?? '');
        setReps(lastSet?.reps?.toString() ?? '');
        setSelectedEquipment(lastSet?.equipment_type ?? selectedExercise.default_equipment_type ?? null);
        setSelectedVariation(lastSet?.variation ?? null);
        
    } else if (!isInitialDefault && selectedExercise) {
        // No last set data for this *manually selected* exercise, use its defaults
        setWeight(''); 
        setReps('');   
        setSelectedEquipment(selectedExercise.default_equipment_type ?? null);
        setSelectedVariation(null); 
    }
  // Ensure dependencies are correct - only react to changes in these after initial load
  }, [selectedExercise, lastSet, defaultLogData?.exercise_id]); 

  // *** Refactored Mutation ***
  const saveSingleLogMutation = useMutation({
    mutationFn: async (newLogData: NewSingleLogData) => {
      if (!user) throw new Error("User not authenticated.");
      const userId = user.id;
      const { exercise_id, reps, weight, equipment_type, variation } = newLogData;

      // --- Transaction Start (Simulated Client-Side) ---
      // NOTE: For true atomicity, use a Supabase Function (rpc).
      
      // 1. Insert into workouts
      const workoutInsertData: any = { // Use any due to is_single_log potentially missing in generated types
          user_id: userId,
          duration_seconds: 0,
          completed: true,
          is_single_log: true, // Mark as single log
      };
      const { data: newWorkout, error: workoutError } = await supabase
          .from('workouts') // Assuming types might not have is_single_log yet
          .insert(workoutInsertData)
          .select()
          .single();

      if (workoutError || !newWorkout) {
          console.error("Error creating workout record for single log:", workoutError);
          throw new Error(`Failed to create workout record: ${workoutError?.message || 'Unknown error'}`);
      }
      const newWorkoutId = newWorkout.id;

      // 2. Insert into workout_exercises
      const workoutExerciseInsertData: TablesInsert<'workout_exercises'> = {
          workout_id: newWorkoutId,
          exercise_id: exercise_id,
          order: 1, // Only one exercise in this log
      };
      const { data: newWorkoutExercise, error: workoutExerciseError } = await supabase
          .from('workout_exercises')
          .insert(workoutExerciseInsertData)
          .select()
          .single();
      
      if (workoutExerciseError || !newWorkoutExercise) {
          console.error("Error creating workout_exercise record:", workoutExerciseError);
          // Attempt to clean up the created workout record (optional, best-effort)
          await supabase.from('workouts').delete().match({ id: newWorkoutId });
          throw new Error(`Failed to link exercise to workout: ${workoutExerciseError?.message || 'Unknown error'}`);
      }
      const newWorkoutExerciseId = newWorkoutExercise.id;

      // 3. Insert into exercise_sets
      const setInsertData: TablesInsert<'exercise_sets'> = {
          workout_exercise_id: newWorkoutExerciseId,
          set_number: 1, // Only one set for a single log
          weight: weight,
          reps: reps,
          completed: true,
          equipment_type: equipment_type,
          variation: variation,
      };
      const { error: setError } = await supabase
          .from('exercise_sets')
          .insert(setInsertData);

      if (setError) {
          console.error("Error creating exercise_set record:", setError);
          // Attempt cleanup (optional, best-effort)
          await supabase.from('workout_exercises').delete().match({ id: newWorkoutExerciseId });
          await supabase.from('workouts').delete().match({ id: newWorkoutId });
          throw new Error(`Failed to save exercise set details: ${setError.message || 'Unknown error'}`);
      }
      
      // --- Transaction End --- 
      return { workoutId: newWorkoutId }; // Return something on success if needed
    },
    onSuccess: () => {
      toast({
        title: "Exercise Logged",
        description: "Your exercise has been successfully logged.",
      });
      // Invalidate queries that might display workout history or exercise stats
      queryClient.invalidateQueries({ queryKey: ['workouts'] }); 
      queryClient.invalidateQueries({ queryKey: ['lastSet', user?.id, selectedExerciseId] });
      queryClient.invalidateQueries({ queryKey: ['exerciseHistory', selectedExerciseId] }); // Example if you have such a query
      queryClient.invalidateQueries({ queryKey: ['analyticsData'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error saving single exercise log:", error);
      toast({
        title: "Save Error",
        description: `${error.message || 'Failed to log exercise.'} Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const repsValue = parseInt(reps, 10);
    const weightValue = parseFloat(weight) || 0; // Default to 0 if empty or invalid

    if (!selectedExerciseId) {
      toast({ title: "Missing Info", description: "Please select an exercise.", variant: "destructive" });
      return;
    }
    if (isNaN(repsValue) || repsValue <= 0) {
      toast({ title: "Invalid Input", description: "Please enter a valid number of reps (> 0).", variant: "destructive" });
      return;
    }
    if (isNaN(weightValue) || weightValue < 0) {
      toast({ title: "Invalid Input", description: "Please enter a valid weight (>= 0).", variant: "destructive" });
      return;
    }

    const newLogData: NewSingleLogData = {
      exercise_id: selectedExerciseId,
      reps: repsValue,
      weight: weightValue,
      equipment_type: selectedEquipment,
      variation: selectedVariation,
    };

    saveSingleLogMutation.mutate(newLogData);
  };

  // Handlers for +/- buttons
  const handleIncrementDecrement = (field: 'weight' | 'reps', amount: number) => {
    if (field === 'weight') {
      const currentValue = parseFloat(weight) || 0;
      const newValue = Math.max(0, currentValue + amount); // Prevent negative weight
      // Format to avoid excessive decimals from floating point math
      setWeight(newValue.toFixed(newValue % 1 === 0 ? 0 : 1)); 
    } else if (field === 'reps') {
      const currentValue = parseInt(reps, 10) || 0;
      const newValue = Math.max(1, currentValue + amount); // Prevent reps < 1
      setReps(newValue.toString());
    }
  };

  const isPending = saveSingleLogMutation.isPending || isLoadingExercises || isLoadingVariations || isLoadingLastSet;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Single Exercise</DialogTitle>
          <DialogDescription>
            Quickly log an exercise result outside a full session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 grid gap-4">
          {/* Exercise Selector */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-grow min-w-0">
              <label htmlFor="exercise-select" className="sr-only">Exercise</label>
              {isLoadingExercises ? (
                <div className="h-9 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : errorExercises ? (
                <p className="text-red-500 text-sm">Error loading exercises.</p>
              ) : (
                <select 
                  id="exercise-select" 
                  value={selectedExerciseId}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  className="block w-full min-w-[150px] p-2 h-9 border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring text-sm"
                  disabled={isPending}
                >
                  <option value="" disabled>Select Exercise...</option>
                  {exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Popover open={equipmentPopoverOpen} onOpenChange={setEquipmentPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs w-auto border-border" disabled={isPending}>
                    {selectedEquipment ?? "Equipment"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1">
                  <div className="flex flex-col gap-1">
                    {EQUIPMENT_TYPES.map((type) => (
                      <Button
                        key={type}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 px-2 text-xs"
                        onClick={() => {
                          setSelectedEquipment(type);
                          setEquipmentPopoverOpen(false);
                        }}
                        disabled={selectedEquipment === type}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={variationPopoverOpen} onOpenChange={setVariationPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-full h-8 px-3 text-xs w-auto border-border min-w-[90px] justify-center"
                    disabled={isPending || isLoadingVariations || !selectedExerciseId}
                  >
                    {isLoadingVariations && selectedExerciseId ? <Loader2 className="h-3 w-3 animate-spin"/> : (selectedVariation ?? DEFAULT_VARIATION)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1">
                  <div className="flex flex-col gap-1">
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 px-2 text-xs italic"
                      onClick={() => {
                        setSelectedVariation(null);
                        setVariationPopoverOpen(false);
                      }}
                      disabled={selectedVariation === null}
                    >
                      {DEFAULT_VARIATION}
                    </Button>
                    {variations.map((variation) => (
                      <Button
                        key={variation.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 px-2 text-xs"
                        onClick={() => {
                          setSelectedVariation(variation.variation_name);
                          setVariationPopoverOpen(false);
                        }}
                        disabled={selectedVariation === variation.variation_name}
                      >
                        {variation.variation_name}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* --- Weight & Reps Inputs --- */}
          <div className="grid grid-cols-2 gap-4">
            {/* Weight Input Group */} 
            <div>
              <label htmlFor="weight-input" className="block text-sm font-medium mb-1">Weight (kg/lbs)</label>
              <input 
                type="number" 
                id="weight-input" 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                step="0.5"
                min="0"
                inputMode="decimal" 
                className="mt-1 block w-full p-2 border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm text-center"
                placeholder="0"
                disabled={isPending}
              />
              {/* Buttons Container Below Input */}
              <div className="flex items-center justify-center gap-2 mt-1.5"> 
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:bg-accent" // Made slightly smaller
                  onClick={() => handleIncrementDecrement('weight', -0.5)}
                  disabled={isPending}
                  aria-label="Decrease weight by 0.5"
                >
                  <Minus size={14} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:bg-accent"
                  onClick={() => handleIncrementDecrement('weight', 0.5)}
                  disabled={isPending}
                  aria-label="Increase weight by 0.5"
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>
            
            {/* Reps Input Group */} 
            <div>
              <label htmlFor="reps-input" className="block text-sm font-medium mb-1">Reps</label>
              <input 
                type="number" 
                id="reps-input" 
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                min="1"
                inputMode="numeric" 
                pattern="[0-9]*" 
                className="mt-1 block w-full p-2 border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm text-center"
                placeholder="Enter reps"
                disabled={isPending}
              />
              {/* Buttons Container Below Input */} 
              <div className="flex items-center justify-center gap-2 mt-1.5">
                 <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:bg-accent"
                  onClick={() => handleIncrementDecrement('reps', -1)}
                  disabled={isPending || (parseInt(reps, 10) || 0) <= 1} // Disable decrementing below 1
                  aria-label="Decrease reps by 1"
                >
                  <Minus size={14} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:bg-accent"
                  onClick={() => handleIncrementDecrement('reps', 1)}
                  disabled={isPending}
                  aria-label="Increase reps by 1"
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {saveSingleLogMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
            Save Exercise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSingleExerciseDialog; 