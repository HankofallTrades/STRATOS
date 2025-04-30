import React, { Fragment, useMemo, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
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
import { Plus, Check, X, Trash2 } from 'lucide-react'; // Added Check, X icons
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
  [EquipmentTypeEnum.Machine]: 'Machine', // Add Machine display name
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

  // Motion value to track card's x position
  const cardX = useMotionValue(0);

  // Transform cardX to delete button opacity (fade in as card moves left)
  const deleteOpacity = useTransform(
    cardX,
    [-REVEAL_WIDTH * 0.8, 0], // Map x from -80% revealed to 0
    [1, 0] // To opacity 1 to 0
  );

  // --- Handlers ---
  const handleReveal = (id: string) => {
    setRevealedItemId(id);
  };
  const handleHide = () => {
    setRevealedItemId(null);
  };

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const currentX = cardX.get(); // Get current position

    // Determine target position based on offset and velocity
    let targetX = 0;
    if (offset < SWIPE_THRESHOLD || (velocity < -300 && currentX < -REVEAL_WIDTH / 3)) {
      targetX = -REVEAL_WIDTH;
      handleReveal('title'); // Still set state for other logic (e.g., tabIndex)
    } else {
      targetX = 0;
      handleHide();
    }

    // Animate cardX to the target position
    animate(cardX, targetX, {
      type: "spring",
      stiffness: 400,
      damping: 40,
    });
  };

  const handleDeleteExerciseClick = () => {
    // Remove the animation logic here. Parent handles removal & AnimatePresence handles animation.
    // if (cardX.get() < 0) {
    //     animate(cardX, 0, {
    //       type: "spring",
    //       stiffness: 400,
    //       damping: 40,
    //       onComplete: onDeleteExercise // Call actual delete *after* animation
    //     });
    // } else {
    //     onDeleteExercise(); // Delete immediately if not revealed
    // }
    onDeleteExercise(); // Just call the delete handler directly
    handleHide(); // Still hide the button state locally if needed
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
      {/* Static Relative Wrapper for Positioning and Clipping */}
      <div className="relative overflow-hidden rounded-lg">
        {/* Draggable Card Area */}
        <motion.div
          className="relative cursor-grab z-20 bg-card" // Has background to cover delete button
          drag="x"
          dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd} // Use the correct handler
          style={{ x: cardX, touchAction: 'pan-y' }}
        >
          <Card className="w-full rounded-lg">
            <CardHeader className="flex flex-row justify-between items-center gap-2 p-2 sm:p-4">
              {/* Title Area */}
              <div className="flex-grow min-w-0">
                <CardTitle className="text-lg sm:text-xl font-semibold text-left truncate">
                  {workoutExercise.exercise.name}
                </CardTitle>
              </div>

              {/* Interactive Popovers Container */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Equipment Popover */}
                <Popover open={equipmentOpen} onOpenChange={setEquipmentOpen}>
                  <PopoverTrigger asChild onPointerDownCapture={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="rounded-full h-7 px-2.5 text-xs w-auto border-border">
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
                            setEquipmentOpen(false);
                          }}
                          disabled={workoutExercise.equipmentType === type}
                        >
                          {equipmentTypeDisplayNames[type]}
                        </Button>
                      ))}
                      {/* Add New Equipment Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 px-2 text-xs text-blue-600 dark:text-blue-400 mt-1"
                        onClick={() => {
                          // TODO: Implement logic to handle adding a new equipment type
                          // For now, just calling onEquipmentChange with a special value
                          onEquipmentChange('add_new' as any); // Using 'any' temporarily
                          setEquipmentOpen(false);
                        }}
                      >
                        <Plus size={14} className="mr-1" /> Add New
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Variation Popover / Input */}
                {!isAddingVariation ? (
                  <Popover open={variationOpen} onOpenChange={setVariationOpen}>
                    <PopoverTrigger asChild onPointerDownCapture={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" className="rounded-full h-7 px-2.5 text-xs w-auto border-border" disabled={isLoadingVariations || isSavingVariation}>
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
                              setVariationOpen(false);
                            }}
                            disabled={selectedVariation === variation || (selectedVariation === undefined && variation === DEFAULT_VARIATION)}
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
                            setVariationOpen(false);
                          }}
                        >
                          <Plus size={14} className="mr-1" /> Add New
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  /* Add Variation Input Section */
                  <div className="flex items-center gap-1 flex-shrink-0 h-8">
                    <Input
                      type="text"
                      placeholder="New Variation"
                      value={newVariationName}
                      onChange={(e) => onNewVariationNameChange(e.target.value)}
                      className="h-full w-[120px] sm:w-[150px] text-xs"
                      disabled={isSavingVariation}
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-full w-8 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 flex-shrink-0"
                      onClick={onSaveNewVariation}
                      disabled={!newVariationName.trim() || newVariationName.trim().toLowerCase() === DEFAULT_VARIATION.toLowerCase() || isSavingVariation}
                      aria-label="Save new variation"
                    >
                      {isSavingVariation ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <Check size={16} />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-full w-8 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 flex-shrink-0"
                      onClick={onCancelAddVariation}
                      disabled={isSavingVariation}
                      aria-label="Cancel adding variation"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-0 pb-2 px-2 sm:px-4">
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[340px]">
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-[35px] text-center px-1 py-1">Set</TableHead>
                      <TableHead className="w-[70px] text-center px-1 py-1">Prev.</TableHead>
                      <TableHead className="w-[75px] text-center px-1 py-1">Wt (kg)</TableHead>
                      <TableHead className="w-[60px] text-center px-1 py-1">Reps</TableHead>
                      <TableHead className="w-[40px] p-0 text-center"><Check size={16} className="mx-auto" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workoutExercise.sets.map((set, index) => {
                      const setNumber = index + 1;
                      const previousPerformanceForSet = historicalSetPerformances?.[setNumber] ?? null;
                      return (
                        <SetComponent
                          key={set.id}
                          workoutExerciseId={workoutExercise.id}
                          set={set}
                          setIndex={index}
                          previousPerformance={previousPerformanceForSet}
                          userBodyweight={userBodyweight}
                        />
                      );
                    })}
                    <TableRow className="border-b-0">
                      <TableCell className="p-1 text-center">
                        <Button variant="ghost" size="icon" onClick={onAddSet} className="h-7 w-7" aria-label="Add set">
                          <Plus size={16} />
                        </Button>
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stationary Delete Button Area - Use style opacity, add rounded-lg */}
        <motion.div
          className="absolute top-0 right-0 h-full flex items-center justify-center bg-destructive z-10 cursor-pointer rounded-lg"
          style={{ opacity: deleteOpacity, width: REVEAL_WIDTH }}
          aria-hidden={revealedItemId !== 'title'}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-full rounded-none text-lg text-white hover:bg-destructive/80"
            onClick={handleDeleteExerciseClick}
            aria-label="Delete exercise from workout"
            tabIndex={revealedItemId === 'title' ? 0 : -1}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </Fragment>
  );
};