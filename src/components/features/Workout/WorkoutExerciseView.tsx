import React, { Fragment, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
// TanStack Query - Removed hooks, just keep types if needed
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MutationStatus } from '@tanstack/react-query'; // Keep MutationStatus type
// Redux hook - Removed
// import { useAppSelector } from '@/hooks/redux';
// Selector
import { Exercise, ExerciseSet } from '@/lib/types/workout';
import { EquipmentType, EquipmentTypeEnum } from '@/lib/types/enums'; // Correct import path
import { Button } from '@/components/core/button';
// REMOVED Select imports
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/core/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/core/card'; // Re-added CardTitle
import { Plus, Check, X, Trash2, ChevronsUpDown } from 'lucide-react'; // Added Check, X icons and ChevronsUpDown
import SetComponent from './SetComponent'; // Assuming SetComponent exists in the same directory
// Removed Supabase function imports
// import { addExerciseVariationToDB, fetchExerciseVariationsFromDB } from '@/lib/integrations/supabase/exercises';
import { Input } from '@/components/core/input'; // Import Input component
// ADD ToggleGroup imports
// import { ToggleGroup, ToggleGroupItem } from '@/components/core/Toggle/toggle-group';
// ADD Table component imports
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/core/table";
// ADD Popover imports
import { Popover, PopoverContent, PopoverTrigger } from "@/components/core/popover"

// Add map for display names
const equipmentTypeDisplayNames: Record<EquipmentType, string> = {
  [EquipmentTypeEnum.BB]: 'Barbell',
  [EquipmentTypeEnum.DB]: 'Dumbbell',
  [EquipmentTypeEnum.KB]: 'Kettlebell',
  [EquipmentTypeEnum.Cable]: 'Cable',
  [EquipmentTypeEnum.Free]: 'Bodyweight', // Or 'Free Weight'? Let's use Bodyweight for now
};

// Define props passed from WorkoutExerciseContainer
interface WorkoutExerciseViewProps {
  workoutExercise: { id: string; exerciseId: string; exercise: Exercise; sets: ExerciseSet[]; equipmentType?: EquipmentType };
  equipmentTypes: Readonly<EquipmentType[]>;
  overallLastPerformance: { weight: number; reps: number } | null;
  historicalSetPerformances: Record<number, { weight: number; reps: number } | null>;
  userBodyweight?: number | null; // Add user bodyweight prop
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
// Swipe constants
const SWIPE_THRESHOLD = -60; // Pixels to swipe left to reveal
const REVEAL_WIDTH = 75; // Width of the revealed delete button area

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
  userBodyweight, // Destructure userBodyweight
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
  const [revealedItemId, setRevealedItemId] = useState<string | null>(null); // 'title' or set.id

  // State for Popover open state
  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const [variationOpen, setVariationOpen] = useState(false)

  // --- Handlers ---
  const handleReveal = (id: string) => {
    setRevealedItemId(id);
  };
  const handleHide = () => {
    setRevealedItemId(null);
  };

  const handleTitleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number; }; velocity: { x: number; y: number; }; }) => {
    if (info.offset.x < SWIPE_THRESHOLD) {
      handleReveal('title');
    } else if (info.offset.x > SWIPE_THRESHOLD / 2) { // Allow snapping back if not dragged far enough or dragged back right
      handleHide();
    }
    // If dragged between threshold and half-threshold, let animation snap based on current state
  };

  const handleDeleteExerciseClick = () => {
    onDeleteExercise();
    handleHide(); // Hide the button after clicking
  };

  // --- Memos ---
  const sortedEquipmentTypes = useMemo(() => {
    const defaultType = workoutExercise.exercise.default_equipment_type;
    if (!defaultType || !equipmentTypes.includes(defaultType as EquipmentType)) {
      return equipmentTypes; // Return original if no default or default not in list
    }

    const sorted = [...equipmentTypes];
    const index = sorted.indexOf(defaultType as EquipmentType);

    // Should always be found based on the includes check, but double-check
    if (index > -1) {
      sorted.splice(index, 1); // Remove from current position
      sorted.unshift(defaultType as EquipmentType); // Add to the beginning
    }
    return sorted;
  }, [equipmentTypes, workoutExercise.exercise.default_equipment_type]);

  // --- Render ---
  // Removed variationsError check (handled in container)

  // Determine placeholder for variation select using props
  const variationSelectPlaceholder = isLoadingVariations ? "Loading..." : (selectedVariation || DEFAULT_VARIATION);
  const isSavingVariation = addVariationMutationStatus === 'pending'; // Check mutation status

  return (
    <Fragment>
      {/* Selection Popovers container removed from here */}

      {/* Card component */}
      <Card className="w-full"> {/* Ensure card takes full width */}
        {/* Make header relative, flex, row, justify-between, items-center */}
        <CardHeader className="relative p-2 sm:p-4 overflow-hidden flex flex-row justify-between items-center gap-2"> {/* Added flex-row */}

          {/* Motion Div for Title (takes remaining space, handles swipe) */}
          {/* Added flex-grow to allow it to take space */}
          <motion.div
            drag="x"
            dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
            dragElastic={0.1}
            initial={{ x: 0 }}
            animate={{ x: revealedItemId === 'title' ? -REVEAL_WIDTH : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onDragEnd={handleTitleDragEnd}
            onClick={() => { if (revealedItemId === 'title') handleHide(); }} // Tap content to hide
            className="relative z-10 bg-card flex-grow min-w-0" // Need bg, added flex-grow and min-width 0
            style={{ touchAction: 'pan-y' }} // Prioritize vertical scroll over horizontal drag
          >
             <CardTitle className="text-lg sm:text-xl font-semibold text-left truncate"> {/* Added truncate */}
                {workoutExercise.exercise.name}
             </CardTitle>
          </motion.div>

          {/* Popover container moved here (top-right) */}
          {/* Removed flex-wrap and justify-end */}
           <div className="flex items-center gap-2 flex-shrink-0">
            {/* Equipment Popover */}
            <Popover open={equipmentOpen} onOpenChange={setEquipmentOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm" // Keep size sm for consistency or adjust if needed
                  // Apply tag styling: rounded-full, adjusted padding, removed justify-between, w-auto
                  className="rounded-full h-7 px-2.5 text-xs w-auto border-border" // Adjusted height, padding, added border color
                >
                  {/* Remove icon and extra span, just show text */}
                  {workoutExercise.equipmentType ? equipmentTypeDisplayNames[workoutExercise.equipmentType] : "Select Equip."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1">
                <div className="flex flex-col gap-1">
                  {sortedEquipmentTypes.map((type) => (
                    <Button
                      key={type}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 px-2 text-xs"
                      onClick={() => {
                        onEquipmentChange(type as EquipmentType);
                        setEquipmentOpen(false); // Close popover
                      }}
                      disabled={workoutExercise.equipmentType === type} // Disable currently selected
                    >
                      {equipmentTypeDisplayNames[type]}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Variation Popover / Input */}
            {!isAddingVariation ? (
              <Popover open={variationOpen} onOpenChange={setVariationOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    // Apply tag styling: rounded-full, adjusted padding, removed justify-between, w-auto
                    className="rounded-full h-7 px-2.5 text-xs w-auto border-border" // Adjusted height, padding, added border color
                    disabled={isLoadingVariations || isSavingVariation}
                  >
                     {/* Remove icon and extra span, just show text */}
                     {isLoadingVariations ? "Loading..." : (selectedVariation ?? DEFAULT_VARIATION)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1">
                  <div className="flex flex-col gap-1">
                    {variations?.map((variation) => (
                       <Button
                          key={variation}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 px-2 text-xs"
                          onClick={() => {
                            onVariationChange(variation);
                            setVariationOpen(false); // Close popover
                          }}
                          disabled={selectedVariation === variation || (selectedVariation === undefined && variation === DEFAULT_VARIATION)} // Disable currently selected
                        >
                          {variation}
                        </Button>
                    ))}
                     <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 px-2 text-xs text-blue-600 dark:text-blue-400 mt-1"
                        onClick={() => {
                          onVariationChange('add_new');
                          setVariationOpen(false); // Close popover
                        }}
                      >
                        <Plus size={14} className="mr-1" /> Add New
                      </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              // Adding variation input section (kept similar, ensure proper spacing in flex)
              <div className="flex items-center gap-1 flex-shrink-0 h-8"> {/* Ensure height matches popover trigger */}
                  <Input
                    type="text"
                    placeholder="New Variation"
                    value={newVariationName}
                    onChange={(e) => onNewVariationNameChange(e.target.value)}
                    className="h-full w-[120px] sm:w-[150px] text-xs" // Adjusted height/text
                    disabled={isSavingVariation}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-full w-8 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 flex-shrink-0" // Adjusted size
                    onClick={onSaveNewVariation}
                    disabled={!newVariationName.trim() || newVariationName.trim().toLowerCase() === DEFAULT_VARIATION.toLowerCase() || isSavingVariation}
                    aria-label="Save new variation"
                  >
                     {isSavingVariation ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <Check size={16} />} {/* Adjusted icon size */}
                  </Button>
                   <Button
                    size="icon"
                    variant="ghost"
                    className="h-full w-8 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 flex-shrink-0" // Adjusted size
                    onClick={onCancelAddVariation}
                    disabled={isSavingVariation}
                     aria-label="Cancel adding variation"
                  >
                     <X size={16} /> {/* Adjusted icon size */}
                  </Button>
              </div>
            )}
          </div>
          {/* Delete Button remains absolutely positioned relative to CardHeader */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: revealedItemId === 'title' ? 1 : 0 }}
            transition={{ duration: 0.2 }} // Simple fade in/out
            className="absolute top-0 right-0 h-full flex items-center justify-center bg-destructive z-20" // Ensure higher z-index than motion.div
            style={{ width: REVEAL_WIDTH }}
            aria-hidden={revealedItemId !== 'title'} // Keep aria-hidden for accessibility
          >
            <Button
              variant="ghost" // Change variant to ghost
              size="icon"
              // Add text-destructive for icon color, add hover effect
              className="h-full w-full rounded-none text-lg text-destructive hover:bg-destructive/10"
              onClick={handleDeleteExerciseClick} // Use updated handler
              aria-label="Delete exercise from workout"
              tabIndex={revealedItemId === 'title' ? 0 : -1} // Make focusable only when revealed
            >
              <Trash2 className="h-5 w-5" /> {/* Slightly larger icon */}
            </Button>
          </motion.div>
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
                      previousPerformance={previousPerformanceForSet}
                      userBodyweight={userBodyweight} // Pass bodyweight to SetComponent
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
    </Fragment> // Close the wrapper
  );
}; 