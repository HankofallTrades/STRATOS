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
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/core/popover"; // No longer directly needed here
import { supabase } from '@/lib/integrations/supabase/client';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises'; // Assuming this function exists
import { useAuth } from '@/state/auth/AuthProvider'; // Assuming this hook exists
import { useToast } from "@/hooks/use-toast";
import { Exercise } from "@/lib/types/workout";
import { Tables, TablesInsert } from '@/lib/integrations/supabase/types';
import { Loader2, Plus, Minus, Check, X as XIcon } from 'lucide-react'; // Added Check, XIcon
import { cn } from "@/lib/utils/cn"; // For conditional class names
import { Input } from "@/components/core/input"; // Corrected casing
import { Label } from "@/components/core/label"; // Corrected casing
import EquipmentSelector from './EquipmentSelector'; // Added import
import VariationSelector from './VariationSelector'; // Added import
import SwipeableIncrementer from '@/components/core/Controls/SwipeableIncrementer'; // Added import

// --- Constants ---
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
  reps: number | null; // Make reps nullable
  time_seconds: number | null; // Add time_seconds
  // is_static: boolean; // No longer needed here, will be derived from selectedExercise in handleSave
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

// Exercise type from DB, expecting it to have is_static
type ExerciseFromDB = Tables<'exercises'>;
// Equipment type from DB
// type DbEquipmentType = Tables<'equipment_types'>; // Use generated type

// Simplified type for fetched equipment types
interface FetchedEquipmentType {
  id: string;
  name: string;
}

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
  const [timeInSeconds, setTimeInSeconds] = useState<string>(() => defaultLogData?.time_seconds?.toString() ?? '');
  const [weight, setWeight] = useState<string>(() => defaultLogData?.weight?.toString() ?? '');
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(() => defaultLogData?.equipment_type ?? null);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(() => defaultLogData?.variation ?? null);
  const [equipmentPopoverOpen, setEquipmentPopoverOpen] = useState(false);
  const [variationPopoverOpen, setVariationPopoverOpen] = useState(false);
  const [isAddingVariation, setIsAddingVariation] = useState(false); // New state
  const [newVariationName, setNewVariationName] = useState(""); // New state

  // Fetch exercises query
  const { data: exercises = [], isLoading: isLoadingExercises, error: errorExercises } = useQuery<ExerciseFromDB[], Error, ExerciseFromDB[]>({
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
  const { data: variations = [], isLoading: isLoadingVariations, refetch: refetchVariations } = useQuery<ExerciseVariation[]>({
      queryKey: ['exerciseVariations', selectedExerciseId],
      queryFn: async () => {
          if (!selectedExerciseId) return []; 
          const { data, error } = await supabase
              .from('exercise_variations')
              .select('*')
              .eq('exercise_id', selectedExerciseId)
              // Do not fetch 'Standard' if it's stored; it's handled conceptually
              .not('variation_name', 'ilike', DEFAULT_VARIATION); 
          if (error) throw error;
          return data ?? []; 
      },
      enabled: !!selectedExerciseId && open,
  });

  // Fetch Equipment Types from DB
  const { data: dbEquipmentTypes = [], isLoading: isLoadingDbEquipmentTypes, refetch: refetchDbEquipmentTypes } = useQuery<FetchedEquipmentType[], Error, FetchedEquipmentType[]> ({
    queryKey: ['dbEquipmentTypes'],
    queryFn: async (): Promise<FetchedEquipmentType[]> => {
        const { data, error } = await supabase
            .from('equipment_types') // Assuming this is your table name
            .select('id, name');
        if (error) {
            console.error("Error fetching equipment types:", error);
            toast({ title: "Error", description: "Could not load equipment types.", variant: "destructive" });
            return [];
        }
        return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    enabled: open, // Fetch when dialog is open
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

  // Effect to reset form state when dialog opens/closes or defaultLogData changes
  useEffect(() => {
    if (open) {
        const initialExercise = defaultLogData?.exercise_id ? exercises.find(ex => ex.id === defaultLogData.exercise_id) : null;
        const isStaticDefault = initialExercise?.is_static ?? false;

        setSelectedExerciseId(defaultLogData?.exercise_id ?? '');
        setWeight(defaultLogData?.weight?.toString() ?? '');
        setSelectedEquipment(defaultLogData?.equipment_type ?? null);
        
        // Handle initial variation from defaultLogData
        const initialVariation = defaultLogData?.variation;
        if (initialVariation && initialVariation.toLowerCase() !== DEFAULT_VARIATION.toLowerCase()) {
            setSelectedVariation(initialVariation);
        } else {
            setSelectedVariation(null); // Default to Standard (null)
        }

        if (isStaticDefault) {
            setTimeInSeconds(defaultLogData?.time_seconds?.toString() ?? '');
            setReps(''); // Clear reps if static
        } else {
            setReps(defaultLogData?.reps?.toString() ?? '');
            setTimeInSeconds(''); // Clear time if not static
        }
        // Reset variation adding state
        setIsAddingVariation(false);
        setNewVariationName('');
    } else {
        // When closing, clear everything
        setSelectedExerciseId('');
        setReps('');
        setTimeInSeconds('');
        setWeight('');
        setSelectedEquipment(null);
        setSelectedVariation(null);
        queryClient.removeQueries({ queryKey: ['lastSet', user?.id, selectedExerciseId], exact: true });
        queryClient.removeQueries({ queryKey: ['exerciseVariations', selectedExerciseId], exact: true });
    }
  }, [open, defaultLogData, queryClient, user?.id, exercises]);

  // React to changes in selectedExercise (which depends on selectedExerciseId and exercises) and lastSet
  // Do not include defaultLogData here as it's for initial population or full override.
  useEffect(() => {
    // Avoid running if selectedExerciseId matches the defaultLogData exercise_id during initial load with defaultLogData
    const isInitialDefaultContext = defaultLogData?.exercise_id && selectedExerciseId === defaultLogData.exercise_id;
    if (isInitialDefaultContext && open) { // if open and defaultLogData is present, the above useEffect handles it.
      return;
    }

    if (selectedExercise) {
      // Determine if the current selected exercise is static
      const isStatic = selectedExercise.is_static ?? false;

      if (lastSet) { // lastSet is an object (successfully fetched last set data)
        setWeight(lastSet.weight?.toString() ?? '');
        // Directly use lastSet's equipment_type. If null, it means "no specific equipment" or that bodyweight was used.
        setSelectedEquipment(lastSet.equipment_type); 
        
        const lastVariation = lastSet.variation;
        if (lastVariation && lastVariation.toLowerCase() !== DEFAULT_VARIATION.toLowerCase()) {
            setSelectedVariation(lastVariation); // Use lastSet's variation
        } else {
            // If lastSet.variation is null or 'Standard' (case-insensitive), set to null (conceptual Standard)
            setSelectedVariation(null);
        }

        if (isStatic) {
          setTimeInSeconds(lastSet.time_seconds?.toString() ?? '');
          setReps(''); // Clear reps if static
        } else {
          setReps(lastSet.reps?.toString() ?? '');
          setTimeInSeconds(''); // Clear time if not static
        }
      } else { 
        // This 'else' covers:
        // 1. lastSet is null (query ran, no prior set found for this user/exercise)
        // 2. lastSet is undefined (query is loading or hasn't run for the current selectedExercise)
        // In both these cases, default to the exercise's default equipment and 'Standard' variation.
        setWeight(''); 
        setSelectedEquipment(selectedExercise.default_equipment_type ?? 'Bodyweight'); 
        setSelectedVariation(null); // Default to Standard

        if (isStatic) {
          setTimeInSeconds('');
          setReps('');
        } else {
          setReps('');
          setTimeInSeconds('');
        }
      }
    } else { // No exercise selected (e.g. after clearing)
        setWeight('');
        setReps('');
        setTimeInSeconds('');
        setSelectedEquipment(null);
        setSelectedVariation(null); 
    }
  // Ensure all relevant dependencies are included for correct re-evaluation.
  }, [open, defaultLogData, selectedExerciseId, selectedExercise, lastSet]);

  // Mutation to add a new equipment type
  const addEquipmentTypeMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      // Check if equipment type already exists (case-insensitive)
      const existingType = (dbEquipmentTypes as FetchedEquipmentType[]).find(et => et.name.toLowerCase() === name.toLowerCase());
      if (existingType) {
        // toast({ title: "Equipment Exists", description: `"${name}" already exists.`, variant: "default" });
        return existingType; // Return existing type
      }
      const { data: newType, error } = await supabase
        .from('equipment_types')
        .insert({ name })
        .select('id, name')
        .single();
      if (error) throw error;
      return newType;
    },
    onSuccess: (data) => {
      if (data) {
        toast({ title: "Equipment Saved", description: `"${data.name}" is now available.` });
      }
      refetchDbEquipmentTypes();
    },
    onError: (error: any) => {
      console.error("Error adding equipment type:", error);
      toast({ title: "Equipment Error", description: error.message || "Could not save equipment type.", variant: "destructive"});
    },
  });

  // Mutation to add a new variation
  const addVariationMutation = useMutation({
    mutationFn: async ({ exerciseId, variationName }: { exerciseId: string; variationName: string }) => {
      if (!exerciseId) throw new Error("Exercise ID is required to add a variation.");
      
      // Prevent adding "Standard" or case-insensitive variants
      if (variationName.toLowerCase() === DEFAULT_VARIATION.toLowerCase()) {
        // toast({ title: "Default Variation", description: `"${DEFAULT_VARIATION}" is the default and is not saved as a separate variation.`, variant: "default" });
        return null; // Indicate not to save, but handle as success for UI flow
      }

      // Check if variation already exists for this exercise (case-insensitive)
      const existingVariation = variations.find(v => v.variation_name.toLowerCase() === variationName.toLowerCase());
      if (existingVariation) {
        return existingVariation; 
      }

      const { data: newVariation, error } = await supabase
        .from('exercise_variations')
        .insert({ exercise_id: exerciseId, variation_name: variationName })
        .select()
        .single();

      if (error) throw error;
      return newVariation;
    },
    onSuccess: (data) => { // data can be ExerciseVariation or null
      if (data) { // A new or existing variation was returned
        toast({ title: "Variation Saved", description: `"${data.variation_name}" is now available.` });
        setSelectedVariation(data.variation_name); // Select the new/existing variation
        refetchVariations(); 
      } else { // Null was returned, meaning "Standard" was entered
        toast({ title: "Default Selected", description: `Using "${DEFAULT_VARIATION}" variation.`});
        setSelectedVariation(null); // Explicitly set to null for Standard
      }
      setIsAddingVariation(false);
      setNewVariationName("");
    },
    onError: (error: any) => {
      console.error("Error adding variation:", error);
      toast({ title: "Variation Error", description: error.message || "Could not save variation.", variant: "destructive" });
    },
  });

  // *** Refactored Mutation ***
  const saveSingleLogMutation = useMutation({
    mutationFn: async (newLogData: NewSingleLogData) => {
      if (!user) throw new Error("User not authenticated.");
      const userId = user.id;
      // Destructure all parts including new ones
      const { exercise_id, reps, time_seconds, weight, equipment_type, variation } = newLogData;

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
          reps: reps, // Will be null if time_seconds is not, and vice-versa
          time_seconds: time_seconds, // Will be null if reps is not
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
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['weeklyArchetypeSets_v2', user.id] });
      }
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
    const weightValue = parseFloat(weight) || 0;

    if (!selectedExerciseId || !selectedExercise) {
      toast({ title: "Missing Info", description: "Please select an exercise.", variant: "destructive" });
      return;
    }
    if (isNaN(weightValue) || weightValue < 0) {
      toast({ title: "Invalid Input", description: "Please enter a valid weight (>= 0).", variant: "destructive" });
      return;
    }

    const isStaticExercise = selectedExercise.is_static ?? false;
    let repsValue: number | null = null;
    let timeValue: number | null = null;

    if (isStaticExercise) {
      timeValue = parseInt(timeInSeconds, 10);
      if (isNaN(timeValue) || timeValue <= 0) {
        toast({ title: "Invalid Input", description: "Please enter a valid time in seconds (> 0).", variant: "destructive" });
        return;
      }
    } else {
      repsValue = parseInt(reps, 10);
      if (isNaN(repsValue) || repsValue <= 0) {
        toast({ title: "Invalid Input", description: "Please enter a valid number of reps (> 0).", variant: "destructive" });
        return;
      }
    }

    const newLogData: NewSingleLogData = {
      exercise_id: selectedExerciseId,
      reps: repsValue,
      time_seconds: timeValue,
      weight: weightValue,
      equipment_type: selectedEquipment,
      variation: selectedVariation,
    };

    saveSingleLogMutation.mutate(newLogData);
  };

  // Simplified handler, SwipeableIncrementer now provides the exact adjustment amount
  const handleIncrementDecrement = (field: 'weight' | 'reps' | 'time', adjustment: number) => {
    if (field === 'weight') {
      const currentValue = parseFloat(weight) || 0;
      let newValue = currentValue + adjustment;
      newValue = Math.max(0, newValue); // Prevent negative weight
      
      const decimalPlaces = Math.abs(adjustment % 1) > 0 ? 1 : 0; 
      const finalDecimalPlaces = newValue % 1 === 0 ? 0 : decimalPlaces;
      setWeight(newValue.toFixed(finalDecimalPlaces));

    } else if (field === 'reps') {
      const currentValue = parseInt(reps, 10) || 0;
      let newValue = currentValue + adjustment;
      newValue = Math.max(1, newValue); // Prevent reps < 1
      setReps(newValue.toString());

    } else if (field === 'time') {
      const currentValue = parseInt(timeInSeconds, 10) || 0;
      let newValue = currentValue + adjustment;
      newValue = Math.max(1, newValue); // Prevent time < 1
      setTimeInSeconds(newValue.toString());
    }
  };

  const handleTriggerAddNewVariation = () => {
    setIsAddingVariation(true);
    setVariationPopoverOpen(false); // Close the popover if it was open
  };

  const handleSaveNewVariation = () => {
    const trimmedName = newVariationName.trim();
    if (!trimmedName) {
      toast({ title: "Missing Name", description: "Please enter a variation name.", variant: "destructive" });
      return;
    }
    if (!selectedExerciseId) {
      toast({ title: "No Exercise", description: "Please select an exercise first.", variant: "destructive" });
      return;
    }
    
    if (trimmedName.toLowerCase() === DEFAULT_VARIATION.toLowerCase()) {
        // User typed "Standard" or "standard", etc.
        // addVariationMutation will handle setting selectedVariation to null
        addVariationMutation.mutate({ exerciseId: selectedExerciseId, variationName: DEFAULT_VARIATION }); 
        return;
    }
    
    // Check if it's already in the fetched variations list (excluding DEFAULT_VARIATION which isn't fetched that way)
    if (variations.some(v => v.variation_name.toLowerCase() === trimmedName.toLowerCase())) {
        toast({ title: "Variation Exists", description: `"${trimmedName}" already exists. Selecting it.`, variant: "default" });
        setSelectedVariation(trimmedName); // Select existing
        setIsAddingVariation(false);
        setNewVariationName("");
        return;
    }
    
    addVariationMutation.mutate({ exerciseId: selectedExerciseId, variationName: trimmedName });
  };

  const handleCancelAddNewVariation = () => {
    setIsAddingVariation(false);
    setNewVariationName("");
  };

  // Handler for when equipment is selected/added in EquipmentSelector
  const handleEquipmentSelected = (equipmentName: string | null) => {
    setSelectedEquipment(equipmentName);
    if (equipmentName && !(dbEquipmentTypes as FetchedEquipmentType[]).some(et => et.name.toLowerCase() === equipmentName.toLowerCase())) {
      // If it's a new equipment name not in the current DB list, add it
      addEquipmentTypeMutation.mutate({ name: equipmentName });
    }
  };

  const isPending = saveSingleLogMutation.isPending || isLoadingExercises || isLoadingDbEquipmentTypes || isLoadingLastSet || addVariationMutation.isPending || addEquipmentTypeMutation.isPending; // Include addEquipmentTypeMutation.isPending

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
              <EquipmentSelector
                selectedEquipment={selectedEquipment}
                onSelectEquipment={handleEquipmentSelected} // Use the new handler
                equipmentTypes={(dbEquipmentTypes as FetchedEquipmentType[]).map(et => et.name)} // Pass names from DB
                disabled={isPending}
                popoverOpen={equipmentPopoverOpen}
                setPopoverOpen={setEquipmentPopoverOpen}
              />
              {isAddingVariation ? (
                <div className="flex items-center gap-1 flex-shrink-0 h-8">
                  <Input
                    type="text"
                    placeholder="New Variation Name"
                    value={newVariationName}
                    onChange={(e) => setNewVariationName(e.target.value)}
                    className="h-full w-[120px] sm:w-[150px] text-xs"
                    disabled={addVariationMutation.isPending}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNewVariation(); if (e.key === 'Escape') handleCancelAddNewVariation();}}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-full w-8 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 flex-shrink-0"
                    onClick={handleSaveNewVariation}
                    disabled={!newVariationName.trim() || addVariationMutation.isPending}
                    aria-label="Save new variation"
                  >
                    {addVariationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={16} />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-full w-8 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 flex-shrink-0"
                    onClick={handleCancelAddNewVariation}
                    disabled={addVariationMutation.isPending}
                    aria-label="Cancel adding variation"
                  >
                    <XIcon size={16} />
                  </Button>
                </div>
              ) : (
                <VariationSelector
                  selectedVariation={selectedVariation}
                  onSelectVariation={setSelectedVariation}
                  variations={variations}
                  onTriggerAddNewVariation={handleTriggerAddNewVariation} // Pass new handler
                  defaultVariationText={DEFAULT_VARIATION}
                  isLoading={isLoadingVariations} // Pass loading state for variations
                  disabled={isPending || !selectedExerciseId}
                  popoverOpen={variationPopoverOpen}
                  setPopoverOpen={setVariationPopoverOpen}
                />
              )}
            </div>
          </div>

          {/* --- Weight & Reps/Time Inputs --- */}
          <div className="grid grid-cols-2 gap-4">
            {/* Weight Input Group */} 
            <div>
              <Label htmlFor="weight-input" className="block text-sm font-medium mb-1">Weight (kg/lbs)</Label>
              <div className="flex flex-col gap-2">
                <Input 
                  type="number" 
                  id="weight-input" 
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  step="0.5"
                  min="0"
                  inputMode="decimal" 
                  className="block w-full p-2 border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm text-center"
                  placeholder="0"
                  disabled={isPending}
                />
                {/* Buttons Container Below Input */}
                <div className="flex items-center justify-center"> 
                  <SwipeableIncrementer
                    onAdjust={(adj) => handleIncrementDecrement('weight', adj)}
                    smallStepPositive={0.5}
                    smallStepNegative={-0.5}
                    swipeUpStep={5}
                    swipeDownStep={-5}
                    swipeRightStep={2.5}
                    swipeLeftStep={-2.5}
                    disabled={isPending}
                    label="Adjust weight"
                    buttonSize="icon"
                    iconSize={14}
                    wrapperClassName="gap-1" // Maintain original gap if desired, or adjust
                  />
                </div>
              </div>
            </div>
            
            {/* Conditional Reps or Time Input Group */} 
            {selectedExercise?.is_static ? (
              <div>
                <Label htmlFor="time-input" className="block text-sm font-medium mb-1">Time (seconds)</Label>
                <div className="flex flex-col gap-2">
                  <Input 
                    type="number" 
                    id="time-input" 
                    value={timeInSeconds}
                    onChange={(e) => setTimeInSeconds(e.target.value)}
                    min="1"
                    inputMode="numeric" 
                    pattern="[0-9]*" 
                    className="block w-full p-2 border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm text-center"
                    placeholder="Enter time"
                    disabled={isPending || !selectedExerciseId}
                  />
                  <div className="flex items-center justify-center"> 
                    <SwipeableIncrementer
                      onAdjust={(adj) => handleIncrementDecrement('time', adj)}
                      smallStepPositive={1}
                      smallStepNegative={-1}
                      swipeUpStep={5}
                      swipeDownStep={-5}
                      swipeRightStep={2} // Adjusted from 2.5 for time
                      swipeLeftStep={-2}  // Adjusted from -2.5 for time
                      disabled={isPending || !selectedExerciseId}
                      label="Adjust time"
                      buttonSize="icon"
                      iconSize={14}
                      wrapperClassName="gap-1"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="reps-input" className="block text-sm font-medium mb-1">Reps</Label>
                <div className="flex flex-col gap-2">
                  <Input 
                    type="number" 
                    id="reps-input" 
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    min="1"
                    inputMode="numeric" 
                    pattern="[0-9]*" 
                    className="block w-full p-2 border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm text-center"
                    placeholder="Enter reps"
                    disabled={isPending || !selectedExerciseId}
                  />
                  <div className="flex items-center justify-center"> 
                    <SwipeableIncrementer
                      onAdjust={(adj) => handleIncrementDecrement('reps', adj)}
                      smallStepPositive={1}
                      smallStepNegative={-1}
                      swipeUpStep={10}     // New: Reps swipe up by 10
                      swipeDownStep={-10}  // New: Reps swipe down by -10
                      swipeRightStep={5}   // New: Reps swipe right by 5
                      swipeLeftStep={-5}   // New: Reps swipe left by -5
                      disabled={isPending || !selectedExerciseId}
                      label="Adjust reps"
                      buttonSize="icon"
                      iconSize={14}
                      wrapperClassName="gap-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        <DialogFooter className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isPending}
            className="bg-fitnessBlue hover:bg-fitnessBlue/90"
          >
            {saveSingleLogMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSingleExerciseDialog; 