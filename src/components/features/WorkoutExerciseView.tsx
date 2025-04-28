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
import { Plus, Check, X, Trash2 } from 'lucide-react'; // Added Check, X icons
import SetComponent from './SetComponent'; // Assuming SetComponent exists in the same directory
// Removed Supabase function imports
// import { addExerciseVariationToDB, fetchExerciseVariationsFromDB } from '@/lib/integrations/supabase/exercises';
import { Input } from '@/components/core/input'; // Import Input component
// ADD Table component imports
import {
  Table,
  TableBody,
  TableCell,
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
  onAddSet: () => void;
  onEquipmentChange: (value: EquipmentType) => void;
  onDeleteExercise: () => void; // Add delete handler prop
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

// Helper function for formatting previous performance
const formatPrevious = (perf: { weight: number; reps: number } | null): string => {
  if (!perf) return '-';
  return `${perf.weight}kg x ${perf.reps}`;
};

export const WorkoutExerciseView = ({
  // Destructure all props
  workoutExercise,
  equipmentTypes,
  overallLastPerformance,
  historicalSetPerformances,
  onAddSet,
  onEquipmentChange,
  onDeleteExercise, // Use the new prop
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
    <Card className="w-full"> {/* Ensure card takes full width */}
      <CardHeader className="p-2 sm:p-4"> {/* Reduced padding */}
        {/* Use justify-between on sm+, increased text size */}
        <CardTitle className="relative flex flex-col sm:flex-row sm:justify-between items-center gap-1 sm:gap-2 text-lg sm:text-xl">
          {/* New outer wrapper div for centering group, takes up space on sm+ */}
          <div className="flex-grow flex justify-center">
            {/* Inner div still centers its own items if they wrap */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap sm:flex-nowrap">
              <Select value={workoutExercise.equipmentType ?? undefined} onValueChange={(value) => onEquipmentChange(value as EquipmentType)}>
                {/* Adjusted Select size slightly for larger text, removed border/ring */}
                <SelectTrigger className="w-[90px] h-9 sm:h-10 text-xs sm:text-sm flex-shrink-0 border-0 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Equip." />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Exercise Name - still shrinks/truncates */}
              <span className="font-semibold flex-shrink min-w-0 overflow-hidden text-ellipsis whitespace-nowrap mx-1">
                {workoutExercise.exercise.name}
              </span>

              {/* Variation Section */}
              {!isAddingVariation ? (
                (exerciseId) && (
                  <Select
                    value={selectedVariation ?? DEFAULT_VARIATION}
                    onValueChange={onVariationChange}
                    disabled={isLoadingVariations || isSavingVariation}
                  >
                    {/* Adjusted Select size slightly, removed border/ring */}
                    <SelectTrigger className="w-auto min-w-[100px] max-w-[150px] h-9 sm:h-10 text-xs sm:text-sm flex-shrink-0 border-0 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder={variationSelectPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
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
                // Adding variation input section - Adjusted size slightly
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Input
                    type="text"
                    placeholder="New Variation"
                    value={newVariationName}
                    onChange={(e) => onNewVariationNameChange(e.target.value)}
                    className="h-9 sm:h-10 w-[120px] sm:w-[150px]" // Adjusted height
                    disabled={isSavingVariation}
                    autoFocus
                  />
                  {/* Adjusted button sizes slightly */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 sm:h-10 sm:w-10 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 flex-shrink-0"
                    onClick={onSaveNewVariation}
                    disabled={!newVariationName.trim() || newVariationName.trim().toLowerCase() === DEFAULT_VARIATION.toLowerCase() || isSavingVariation}
                    aria-label="Save new variation"
                  >
                     {isSavingVariation ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <Check size={18} />}
                  </Button>
                   <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 sm:h-10 sm:w-10 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 flex-shrink-0"
                    onClick={onCancelAddVariation}
                    disabled={isSavingVariation}
                     aria-label="Cancel adding variation"
                  >
                     <X size={18} />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Delete Button - Positioning unchanged, but justify-between on parent pushes it right on sm+ */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 sm:relative sm:top-auto sm:right-auto text-destructive hover:bg-destructive/10 flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9" // Adjusted size slightly
            onClick={onDeleteExercise}
            aria-label="Delete exercise from workout"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      {/* Reduced CardContent padding, especially horizontal */}
      <CardContent className="pt-0 pb-2 px-2 sm:px-4">
         {/* Make table container scrollable horizontally ONLY if needed, but aim to fit */}
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[340px]">{/* Use min-width instead of w-auto to ensure minimum space */}
            {/* <TableCaption>Recent sets for {workoutExercise.exercise.name}.</TableCaption> */}
            <TableHeader>
              {/* Use text-xs and reduced padding */}
              <TableRow className="text-xs">
                <TableHead className="w-[35px] text-center px-1 py-1">Set</TableHead><TableHead className="w-[70px] text-center px-1 py-1">Prev.</TableHead>{/* Reduced width from 100px */}<TableHead className="w-[75px] text-center px-1 py-1">Wt (kg)</TableHead>{/* Abbreviated */}<TableHead className="w-[60px] text-center px-1 py-1">Reps</TableHead>{/* Adjusted check column size and padding */}<TableHead className="w-[40px] p-0 text-center"><Check size={16} className="mx-auto" /></TableHead>
              </TableRow>
            </TableHeader><TableBody>
              {workoutExercise.sets.map((set, index) => {
                const setNumber = index + 1;
                const previousPerformanceForSet = historicalSetPerformances?.[setNumber] ?? null;
                // Use helper to format previous performance for display in SetComponent if needed
                // OR pass the formatted string directly if SetComponent accepts it
                return (
                  <SetComponent
                    key={set.id}
                    workoutExerciseId={workoutExercise.id}
                    set={set}
                    setIndex={index}
                    // Pass raw data, let SetComponent format it if necessary
                    previousPerformance={previousPerformanceForSet}
                    // Or pass formatted string:
                    // previousPerformanceFormatted={formatPrevious(previousPerformanceForSet)}
                  />
                );
              })}
              {/* New Row for Add Set Button */}
              <TableRow className="border-b-0">
                <TableCell className="p-1 text-center"> {/* Padding adjustment as needed */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onAddSet}
                    className="h-7 w-7" // Smaller icon button
                    aria-label="Add set"
                  >
                    <Plus size={16} />
                  </Button>
                </TableCell>
                {/* Add empty cells to fill the remaining columns */}
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody></Table>
        </div>
      </CardContent>
    </Card>
  );
}; 