import React from 'react';
// TanStack Query - Removed hooks, just keep types if needed
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MutationStatus } from '@tanstack/react-query'; // Keep MutationStatus type
// Redux hook - Removed
// import { useAppSelector } from '@/hooks/redux';
// Selector
import { Exercise, ExerciseSet } from '@/lib/types/workout';
import { EquipmentType } from '@/lib/types/enums'; // Correct import path
import { Button } from '@/components/core/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/core/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/core/card';
import { Plus, Check, X } from 'lucide-react'; // Added Check, X icons
import SetComponent from './SetComponent'; // Assuming SetComponent exists in the same directory
// Removed Supabase function imports
// import { addExerciseVariationToDB, fetchExerciseVariationsFromDB } from '@/lib/integrations/supabase/exercises';
import { Input } from '@/components/core/input'; // Import Input component
// ADD Table component imports
import {
  Table,
  TableBody,
//   TableCaption, // Removed unused TableCaption
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/core/table";

// Define props passed from WorkoutExerciseContainer
interface WorkoutExerciseViewProps {
  workoutExercise: { id: string; exerciseId: string; exercise: Exercise; sets: ExerciseSet[]; equipmentType?: EquipmentType };
  equipmentTypes: Readonly<EquipmentType[]>;
  overallLastPerformance: { weight: number; reps: number } | null;
  historicalSetPerformances: Record<number, { weight: number; reps: number } | null>;
  oneRepMax: number | null;
  onAddSet: () => void;
  onEquipmentChange: (value: EquipmentType) => void;
  // Variation related props from container
  variations: string[];
  selectedVariation: string | undefined;
  isAddingVariation: boolean;
  newVariationName: string;
  isLoadingVariations: boolean;
  addVariationMutationStatus: MutationStatus;
  onVariationChange: (value: string) => void; // Parameter type updated (no longer needs null)
  onNewVariationNameChange: (value: string) => void;
  onSaveNewVariation: () => void;
  onCancelAddVariation: () => void;
}

const DEFAULT_VARIATION = 'Standard'; // Define default variation

export const WorkoutExerciseView = ({
  // Destructure all props
  workoutExercise,
  equipmentTypes,
  overallLastPerformance,
  historicalSetPerformances,
  oneRepMax,
  onAddSet,
  onEquipmentChange,
  // Variation props
  variations,
  selectedVariation,
  isAddingVariation,
  newVariationName,
  isLoadingVariations,
  addVariationMutationStatus,
  onVariationChange,
  onNewVariationNameChange,
  onSaveNewVariation,
  onCancelAddVariation,
}: WorkoutExerciseViewProps) => {
  // Removed state: selectedVariation, isAddingVariation, newVariationName
  // Removed queryClient
  const exerciseId = workoutExercise.exerciseId;
  // Removed TanStack Query hooks (useQuery, useMutation)
  // Removed useEffect hook

  // --- Handlers (now passed as props or simplified) ---
  // handleVariationChange is now directly `onVariationChange` prop
  // handleSaveNewVariation is now `onSaveNewVariation` prop
  // handleCancelAddVariation is now `onCancelAddVariation` prop

  // --- Render ---
  // Removed variationsError check (handled in container)

  // Determine placeholder for variation select using props
  const variationSelectPlaceholder = isLoadingVariations ? "Loading..." : (selectedVariation || DEFAULT_VARIATION);
  const isSavingVariation = addVariationMutationStatus === 'pending'; // Check mutation status

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

            {/* Variation Section - Logic now uses props */}
            {!isAddingVariation ? (
              (exerciseId) && (
                <Select
                  value={selectedVariation ?? DEFAULT_VARIATION}
                  onValueChange={onVariationChange} // Use prop handler
                  disabled={isLoadingVariations || isSavingVariation} // Use loading/saving status from props
                >
                  <SelectTrigger className="w-auto min-w-[120px]">
                    <SelectValue placeholder={variationSelectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Ensure variations array exists before mapping */}
                    {variations?.map((variation) => (
                      <SelectItem key={variation} value={variation}>
                        {variation}
                      </SelectItem>
                    ))}
                    <SelectItem value="add_new" className="text-blue-600 dark:text-blue-400">
                      <span className="flex items-center"><Plus size={14} className="mr-1" /> Add New</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  placeholder="New Variation Name"
                  value={newVariationName} // Use prop value
                  onChange={(e) => onNewVariationNameChange(e.target.value)} // Use prop handler
                  className="h-9"
                  disabled={isSavingVariation} // Use saving status
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50"
                  onClick={onSaveNewVariation} // Use prop handler
                  disabled={!newVariationName.trim() || newVariationName.trim().toLowerCase() === DEFAULT_VARIATION.toLowerCase() || isSavingVariation}
                  aria-label="Save new variation"
                >
                   {isSavingVariation ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <Check size={18} />}
                </Button>
                 <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
                  onClick={onCancelAddVariation} // Use prop handler
                  disabled={isSavingVariation}
                   aria-label="Cancel adding variation"
                >
                   <X size={18} />
                </Button>
              </div>
            )}
          </div>
          {/* Last Performance - Display logic remains the same, but data is now filtered */}
          {overallLastPerformance && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              Last: {overallLastPerformance.weight} kg × {overallLastPerformance.reps} reps
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
           {/* <TableCaption>Recent sets for {workoutExercise.exercise.name}.</TableCaption> */}
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">Set</TableHead>
              <TableHead className="w-[100px] text-center">Previous</TableHead>
              <TableHead className="w-[100px] text-center">Weight (kg)</TableHead>
              <TableHead className="w-[100px] text-center">Reps</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workoutExercise.sets.map((set, index) => {
              // Get the specific historical performance for this set index
              // Use index + 1 as the set number key for lookup
              const setNumber = index + 1;
              const previousPerformanceForSet = historicalSetPerformances?.[setNumber] ?? null;
              return (
                <SetComponent
                  key={set.id} // React key
                  workoutExerciseId={workoutExercise.id}
                  set={set}
                  setIndex={index}
                  oneRepMax={oneRepMax} // Pass oneRepMax down
                  previousPerformance={previousPerformanceForSet}
                />
              );
            })}
          </TableBody>
        </Table>

        <div className="mt-4">
          <Button onClick={onAddSet} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add Set
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 