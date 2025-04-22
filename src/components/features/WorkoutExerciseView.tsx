import React, { useState, useEffect } from 'react';
// TanStack Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Exercise, ExerciseSet } from '@/lib/types/workout';
import { EquipmentType } from '@/lib/types/enums'; // Correct import path
import { Button } from '@/components/core/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/core/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/core/card';
import { Plus, Check, X } from 'lucide-react'; // Added Check, X icons
import SetComponent from './SetComponent'; // Assuming SetComponent exists in the same directory
// Removed direct supabase client import
// import { supabase } from '@/lib/integrations/supabase/client';
// Import Supabase functions
import { addExerciseVariationToDB, fetchExerciseVariationsFromDB } from '@/lib/integrations/supabase/exercises';
import { Input } from '@/components/core/input'; // Import Input component

interface WorkoutExerciseViewProps {
  workoutExercise: { id: string; exerciseId: string; exercise: Exercise; sets: ExerciseSet[]; equipmentType?: EquipmentType }; // Added equipmentType
  equipmentTypes: Readonly<EquipmentType[]>; // Use readonly array
  lastPerformance: { weight: number; reps: number } | null;
  oneRepMax: number | null; // Add oneRepMax prop
  onAddSet: () => void;
  onEquipmentChange: (value: EquipmentType) => void; // Use specific type
  onVariationChange: (value: string | null) => void; // Allow null for clearing/adding new
  // onSetUpdate: (set: ExerciseSet) => void; // Removed - SetComponent handles updates internally
  // onSetDelete: (setId: string) => void; // Removed - SetComponent handles deletes internally
}

// Removed helper function - moved to exercises.ts
// async function fetchExerciseVariations(exerciseId: string): Promise<string[]> { ... }

export const WorkoutExerciseView = ({
  workoutExercise,
  equipmentTypes,
  lastPerformance,
  oneRepMax, // Destructure oneRepMax
  onAddSet,
  onEquipmentChange,
  onVariationChange,
}: WorkoutExerciseViewProps) => {
  const queryClient = useQueryClient();
  const exerciseId = workoutExercise.exerciseId;
  const DEFAULT_VARIATION = 'Standard';

  // --- State ---
  // Default to 'Standard' initially if no specific variation from last set
  const [selectedVariation, setSelectedVariation] = useState<string | undefined>(
    workoutExercise.sets.at(-1)?.variation ?? DEFAULT_VARIATION
  );
  const [isAddingVariation, setIsAddingVariation] = useState(false);
  const [newVariationName, setNewVariationName] = useState('');

  // --- TanStack Query ---
  // Query for fetching variations using the imported function
  const { data: variations = [], isLoading: isLoadingVariations, error: variationsError } = useQuery({
    queryKey: ['exerciseVariations', exerciseId], // Query key includes exerciseId
    queryFn: () => fetchExerciseVariationsFromDB(exerciseId), // Use imported function
    enabled: !!exerciseId, // Only run query if exerciseId exists
    placeholderData: [DEFAULT_VARIATION], // Show 'Standard' immediately
  });

  // Mutation for adding a new variation
  const addVariationMutation = useMutation({
    mutationFn: ({ exerciseId, variationName }: { exerciseId: string; variationName: string }) =>
      addExerciseVariationToDB(exerciseId, variationName),
    onSuccess: (newVariationData) => {
      queryClient.invalidateQueries({ queryKey: ['exerciseVariations', exerciseId] });
      setNewVariationName('');
      setIsAddingVariation(false);
      setSelectedVariation(newVariationData.variation_name);
      onVariationChange(newVariationData.variation_name);
    },
    onError: (error) => {
      console.error("Error adding variation:", error);
    },
  });

  // --- Effects ---
  // Effect to sync selected variation with last set and fetched data, defaulting to Standard
  useEffect(() => {
    const lastSetVariation = workoutExercise.sets.at(-1)?.variation;

    // Determine the target variation
    let targetVariation: string | undefined = DEFAULT_VARIATION;
    if (lastSetVariation && variations.includes(lastSetVariation)) {
      targetVariation = lastSetVariation;
    } else if (selectedVariation && variations.includes(selectedVariation)) {
      // Keep current selection if it's valid and not the default, unless overridden by last set
      targetVariation = selectedVariation;
    } 
    // Otherwise, it defaults to DEFAULT_VARIATION

    // Update state only if necessary
    if (selectedVariation !== targetVariation) {
      setSelectedVariation(targetVariation);
      // Also notify parent if the effective variation changes to the default
      if (targetVariation === DEFAULT_VARIATION && selectedVariation !== DEFAULT_VARIATION) {
        onVariationChange(DEFAULT_VARIATION);
      } 
    } else if (!selectedVariation && variations.includes(DEFAULT_VARIATION)) {
       // Ensure default is selected if current selection is undefined
       setSelectedVariation(DEFAULT_VARIATION);
        if(selectedVariation !== DEFAULT_VARIATION) onVariationChange(DEFAULT_VARIATION);
    }

  }, [variations, workoutExercise.sets.length, selectedVariation, onVariationChange]);


  // --- Handlers ---
  const handleVariationChange = (value: string) => {
    if (value === 'add_new') {
      setIsAddingVariation(true);
      setSelectedVariation(undefined); // Clear selection visually while adding
      onVariationChange(null); // Notify parent we are in adding mode
    } else {
      setIsAddingVariation(false);
      setSelectedVariation(value);
      onVariationChange(value); // Notify parent of the selection
    }
  };

  const handleSaveNewVariation = () => {
    if (newVariationName.trim() && newVariationName.trim() !== DEFAULT_VARIATION && exerciseId) {
      addVariationMutation.mutate({ exerciseId, variationName: newVariationName.trim() });
    } else if (newVariationName.trim() === DEFAULT_VARIATION) {
        // Optional: Show feedback that 'Standard' cannot be added again
        console.warn("'Standard' variation already exists or is the default.");
    }
  };

  const handleCancelAddVariation = () => {
    setIsAddingVariation(false);
    setNewVariationName('');
    // Restore selection to default if nothing was selected before
    if (!selectedVariation && variations.includes(DEFAULT_VARIATION)) {
        setSelectedVariation(DEFAULT_VARIATION);
        onVariationChange(DEFAULT_VARIATION);
    }
  };

  // --- Render ---
  if (variationsError) {
    console.error("Variation fetch error:", variationsError);
  }

  // Determine placeholder for variation select
  const variationSelectPlaceholder = isLoadingVariations ? "Loading..." : (selectedVariation || DEFAULT_VARIATION);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={workoutExercise.equipmentType ?? undefined} onValueChange={(value) => onEquipmentChange(value as EquipmentType)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Equipment" />
              </SelectTrigger>
              <SelectContent>
                {equipmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>{workoutExercise.exercise.name}</span>

            {/* Variation Section */}
            {!isAddingVariation ? (
              // Show Select dropdown if not adding
              (exerciseId) && ( // Always show if exerciseId exists
                <Select
                  // Ensure value is never null/undefined for Select, default to Standard
                  value={selectedVariation ?? DEFAULT_VARIATION}
                  onValueChange={handleVariationChange}
                  disabled={isLoadingVariations || addVariationMutation.isPending}
                >
                  <SelectTrigger className="w-auto min-w-[120px]">
                     {/* Display selected or default variation */}
                    <SelectValue placeholder={variationSelectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Filter out 'add_new' if variations array somehow contains it */}
                    {/* Ensure 'Standard' is always shown, other variations follow */}
                    {variations.filter(v => v !== 'add_new').map((variation) => (
                      <SelectItem key={variation} value={variation}>
                        {variation}
                      </SelectItem>
                    ))}
                    {/* Option to add new - Placed at the bottom */}
                    <SelectItem value="add_new" className="text-blue-600 dark:text-blue-400">
                      <span className="flex items-center"><Plus size={14} className="mr-1" /> Add New</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )
            ) : (
              // Show Input field and buttons if adding
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  placeholder="New Variation Name"
                  value={newVariationName}
                  onChange={(e) => setNewVariationName(e.target.value)}
                  className="h-9"
                  disabled={addVariationMutation.isPending}
                  autoFocus
                />
                {/* Save Button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50"
                  onClick={handleSaveNewVariation}
                  disabled={!newVariationName.trim() || newVariationName.trim() === DEFAULT_VARIATION || addVariationMutation.isPending}
                  aria-label="Save new variation"
                >
                  {/* ... icon ... */}
                   {addVariationMutation.isPending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <Check size={18} />}
                </Button>
                {/* Cancel Button */}
                 <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
                  onClick={handleCancelAddVariation}
                  disabled={addVariationMutation.isPending}
                   aria-label="Cancel adding variation"
                >
                  {/* ... icon ... */}
                   <X size={18} />
                </Button>
              </div>
            )}
          </div>
          {/* Last Performance */}
          {lastPerformance && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              Last: {lastPerformance.weight} kg × {lastPerformance.reps} reps
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sets List */}
          {workoutExercise.sets.map((set, index) => (
            <SetComponent
              key={set.id}
              workoutExerciseId={workoutExercise.id}
              // Pass the currently selected variation (which defaults to Standard)
              set={{...set, variation: selectedVariation ?? DEFAULT_VARIATION }}
              setIndex={index}
              exerciseId={workoutExercise.exerciseId}
              oneRepMax={oneRepMax}
            />
          ))}
          {/* Add Set Button */}
          <Button variant="outline" className="w-full border-dashed dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700" onClick={onAddSet}>
            <Plus size={16} className="mr-2" />
            Add Set
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 