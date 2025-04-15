import React, { useState, useEffect } from 'react';
import { Exercise, ExerciseSet } from '@/lib/types/workout';
import { EquipmentType } from '@/lib/types/enums'; // Correct import path
import { Button } from '@/components/core/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/core/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/core/card';
import { Plus } from 'lucide-react';
import SetComponent from './SetComponent'; // Assuming SetComponent exists in the same directory
import { supabase } from '@/lib/integrations/supabase/client'; // Import supabase client

interface WorkoutExerciseViewProps {
  workoutExercise: { id: string; exerciseId: string; exercise: Exercise; sets: ExerciseSet[]; equipmentType?: EquipmentType }; // Added equipmentType
  equipmentTypes: Readonly<EquipmentType[]>; // Use readonly array
  lastPerformance: { weight: number; reps: number } | null;
  oneRepMax: number | null; // Add oneRepMax prop
  onAddSet: () => void;
  onEquipmentChange: (value: EquipmentType) => void; // Use specific type
  onVariationChange: (value: string) => void;
  // onSetUpdate: (set: ExerciseSet) => void; // Removed - SetComponent handles updates internally
  // onSetDelete: (setId: string) => void; // Removed - SetComponent handles deletes internally
}

// Helper function to fetch variations
async function fetchExerciseVariations(exerciseId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('exercise_variations')
    .select('variation_name')
    .eq('exercise_id', exerciseId)
    .order('variation_name', { ascending: true }); // Optional: order variations alphabetically

  if (error) {
    console.error('Error fetching exercise variations:', error);
    // Consider user-facing error handling here
    return [];
  }
  // Extract just the names from the returned objects
  return data?.map(item => item.variation_name) || [];
}

export const WorkoutExerciseView = ({
  workoutExercise,
  equipmentTypes,
  lastPerformance,
  oneRepMax, // Destructure oneRepMax
  onAddSet,
  onEquipmentChange,
  onVariationChange,
  // onSetUpdate, // Removed
  // onSetDelete, // Removed
}: WorkoutExerciseViewProps) => {
  const [variations, setVariations] = useState<string[]>([]);
  const [isLoadingVariations, setIsLoadingVariations] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<string | undefined>(
    workoutExercise.sets.at(-1)?.variation ?? undefined
  );

  useEffect(() => {
    if (workoutExercise.exerciseId) {
      setIsLoadingVariations(true);
      fetchExerciseVariations(workoutExercise.exerciseId)
        .then(fetchedVariations => {
          setVariations(fetchedVariations);
          // If the previously selected variation isn't in the new list, reset it
          // (This handles cases where variations change based on equipment type, etc.)
          // Also resets if there was no previous selection
          const currentLastSetVariation = workoutExercise.sets.at(-1)?.variation;
          if (!fetchedVariations.includes(currentLastSetVariation ?? '')) {
             // Check if the initial selected variation exists in the fetched list
             const initialVariation = workoutExercise.sets.at(-1)?.variation;
             if (initialVariation && fetchedVariations.includes(initialVariation)) {
               setSelectedVariation(initialVariation);
             } else {
               setSelectedVariation(undefined); // Reset if not found or no initial
             }
          } else {
              setSelectedVariation(currentLastSetVariation); // Keep existing if valid
          }
        })
        .catch(error => {
          console.error("Failed to load variations:", error);
          setVariations([]);
          setSelectedVariation(undefined); // Reset on error
        })
        .finally(() => {
          setIsLoadingVariations(false);
        });
    } else {
      // Reset variations if exerciseId is not present
      setVariations([]);
      setSelectedVariation(undefined);
    }
    // Dependency array includes exerciseId to refetch when it changes.
    // Also include sets length to potentially update default based on last set.
  }, [workoutExercise.exerciseId, workoutExercise.sets.length]);

  // Handle internal variation change and call the prop function
  const handleVariationChange = (value: string) => {
      setSelectedVariation(value);
      onVariationChange(value); // Call the parent handler
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap"> {/* Added flex-wrap */}
            {/* Use default_equipment_type and handle potential null/undefined */}
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
            {/* Variation Select: Use variation from last set as default */}
            {/* Show dropdown only if variations exist or are loading */}
            {(isLoadingVariations || variations.length > 0) && (
               <Select
                 value={selectedVariation}
                 onValueChange={handleVariationChange} // Use internal handler
                 disabled={isLoadingVariations} // Disable while loading
               >
                <SelectTrigger className="w-[150px]">
                  {/* Show loading text or placeholder */}
                  <SelectValue placeholder={isLoadingVariations ? "Loading..." : "Variation"} />
                </SelectTrigger>
                <SelectContent>
                  {variations.map((variation) => (
                    <SelectItem key={variation} value={variation}>
                      {variation}
                    </SelectItem>
                  ))}
                  {/* TODO: Re-enable "Add New" variation if needed */}
                  {/* <SelectItem value="add_new">+ Add New</SelectItem> */}
                </SelectContent>
              </Select>
            )}
          </div>
          {lastPerformance && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              Last: {lastPerformance.weight} kg × {lastPerformance.reps} reps
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workoutExercise.sets.map((set, index) => (
            <SetComponent
              key={set.id}
              workoutExerciseId={workoutExercise.id}
              set={{...set, variation: selectedVariation ?? set.variation }} // Pass updated variation
              setIndex={index} // Pass the index as setIndex
              exerciseId={workoutExercise.exerciseId}
              oneRepMax={oneRepMax} // Pass down oneRepMax
              // onUpdate={onSetUpdate} // Removed
              // onDelete={() => onSetDelete(set.id)} // Removed
            />
          ))}
          <Button variant="outline" className="w-full border-dashed dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700" onClick={onAddSet}>
            <Plus size={16} className="mr-2" />
            Add Set
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 