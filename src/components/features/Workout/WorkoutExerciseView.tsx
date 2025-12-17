import React, { Fragment, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// TanStack Query - Removed hooks, just keep types if needed
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MutationStatus } from '@tanstack/react-query'; // Keep MutationStatus type
// Redux hook - Added back for session focus
import { useAppSelector } from '@/hooks/redux';
import { selectSessionFocus } from '@/state/workout/workoutSlice';
// Selector
import { Exercise, ExerciseSet, isCardioExercise } from '@/lib/types/workout';
// Removed EquipmentType imports
// import { EquipmentType, EquipmentTypeEnum } from '@/lib/types/enums'; // Correct import path
import { Button } from '@/components/core/button';
// REMOVED Select imports
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/core/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/core/card'; // Re-added CardTitle
import { Plus, Check, X, Trash2, Minus, Heart, Zap } from 'lucide-react'; // Added Check, X, Minus, Heart, Zap icons
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/core/Dialog'; // Added Dialog imports
import SetComponent from './SetComponent'; // Assuming SetComponent exists in the same directory
// Removed Supabase function imports
// import { addExerciseVariationToDB, fetchExerciseVariationsFromDB } from '@/lib/integrations/supabase/exercises';
import { Input } from '@/components/core/input'; // Import Input component
// ADD ToggleGroup imports
// import { ToggleGroup, ToggleGroupItem } from '@/components/core/Toggle/toggle-group';
import SwipeableIncrementer from '@/components/core/Controls/SwipeableIncrementer'; // Added import
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

// Removed translation map
// const equipmentTypeDisplayNames: Record<EquipmentType, string> = { ... };

// Define the direct string options for equipment
const EQUIPMENT_CHOICES = ["Barbell", "Dumbbell", "Kettlebell", "Cable", "Bodyweight", "Machine"];

// Define props passed from WorkoutExerciseContainer
interface WorkoutExerciseViewProps {
  workoutExercise: {
    id: string;
    exerciseId: string;
    exercise: Exercise & { is_static?: boolean | null }; // Ensure is_static is available
    sets: ExerciseSet[];
    equipmentType?: string
  };
  // Removed equipmentTypes prop
  // equipmentTypes: Readonly<EquipmentType[]>;
  overallLastPerformance: { weight: number; reps: number | null; time_seconds?: number | null } | null; // Updated for time
  historicalSetPerformances: Record<number, { weight: number; reps: number | null; time_seconds?: number | null } | null>; // Updated for time
  userBodyweight?: number | null; // Add user bodyweight prop
  onAddSet: () => void;
  onEquipmentChange: (value: string) => void; // Changed signature to accept string
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
  onUpdateLastSet: (field: 'weight' | 'reps' | 'time' | 'distance', change: number) => void; // Add new prop, added 'time' and 'distance'
}

const DEFAULT_VARIATION = 'Standard'; // Define default variation
// Swipe constants REMOVED
// const SWIPE_THRESHOLD = -60; 
// const REVEAL_WIDTH = 75; 

const LONG_PRESS_DURATION = 700; // milliseconds

// Helper function for formatting previous performance
const formatPrevious = (perf: { weight: number; reps: number | null; time_seconds?: number | null } | null, isStatic: boolean): string => {
  if (!perf) return '-';
  if (isStatic) {
    return perf.time_seconds ? `${perf.weight}kg x ${perf.time_seconds}s` : (perf.weight ? `${perf.weight}kg` : '-');
  }
  return perf.reps ? `${perf.weight}kg x ${perf.reps}` : (perf.weight ? `${perf.weight}kg` : '-');
};

// Helper component for cardio zone indicators
const CardioZoneIndicator: React.FC<{ sessionFocus?: string | null }> = ({ sessionFocus }) => {
  const getZoneInfo = (focus: string | null) => {
    switch (focus) {
      case 'zone2':
        return {
          title: 'Zone 2 Cardio',
          description: 'Aerobic base building (60-70% HR)',
          color: 'bg-green-500',
          textColor: 'text-green-700 dark:text-green-300',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          icon: <Heart className="h-4 w-4" />
        };
      case 'zone5':
        return {
          title: 'Zone 5 Cardio',
          description: 'High intensity (90-100% HR)',
          color: 'bg-purple-500',
          textColor: 'text-purple-700 dark:text-purple-300',
          bgColor: 'bg-purple-50 dark:bg-purple-950/20',
          icon: <Zap className="h-4 w-4" />
        };
      default:
        return {
          title: 'Cardio Exercise',
          description: 'Track duration and distance',
          color: 'bg-blue-500',
          textColor: 'text-blue-700 dark:text-blue-300',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          icon: <Heart className="h-4 w-4" />
        };
    }
  };

  const zoneInfo = getZoneInfo(sessionFocus);

  return (
    <div className={`mb-3 p-2 rounded-lg ${zoneInfo.bgColor}`}>
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-full text-white ${zoneInfo.color}`}>
          {zoneInfo.icon}
        </div>
        <div>
          <div className={`text-sm font-medium ${zoneInfo.textColor}`}>
            {zoneInfo.title}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {zoneInfo.description}
          </div>
        </div>
      </div>
    </div>
  );
};

export const WorkoutExerciseView = ({
  // Destructure all props
  workoutExercise,
  // removed equipmentTypes prop
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
  onUpdateLastSet, // Destructure new prop
}: WorkoutExerciseViewProps) => {
  // Removed state: selectedVariation, isAddingVariation, newVariationName
  // Removed queryClient
  const exerciseId = workoutExercise.exerciseId;
  // REMOVED revealedItemId, cardX, deleteOpacity
  // const [revealedItemId, setRevealedItemId] = useState<string | null>(null); 

  // State for Popover open state
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [variationOpen, setVariationOpen] = useState(false);
  const [showNewEquipmentInput, setShowNewEquipmentInput] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false); // New state for delete dialog

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // REMOVED Motion value and transform
  // const cardX = useMotionValue(0);
  // const deleteOpacity = useTransform(...);

  const isExerciseStatic = useMemo(() => workoutExercise.exercise.is_static ?? false, [workoutExercise.exercise.is_static]);

  // --- Handlers ---
  // REMOVED handleReveal, handleHide, handleDragEnd

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLongPress = () => {
    setShowDeleteConfirmDialog(true);
  };

  const handlePointerDown = () => {
    // Ensure no existing timer is running
    clearLongPressTimer();
    // Start a new timer
    longPressTimerRef.current = setTimeout(handleLongPress, LONG_PRESS_DURATION);
  };


  // handleDeleteExerciseClick is now only called from the confirmation dialog
  const handleDeleteConfirmed = () => {
    onDeleteExercise();
    setShowDeleteConfirmDialog(false);
  };

  const overallLastPerformanceFormatted = useMemo(() => {
    return formatPrevious(overallLastPerformance, isExerciseStatic);
  }, [overallLastPerformance, isExerciseStatic]);

  // --- Memos ---
  // Removed sortedEquipmentTypes useMemo hook
  // const sortedEquipmentTypes = useMemo(() => { ... });

  // --- Render ---
  // Removed variationsError check (handled in container)

  // Determine placeholder for variation select using props
  const variationSelectPlaceholder = isLoadingVariations ? "Loading..." : (selectedVariation || DEFAULT_VARIATION);
  const isSavingVariation = addVariationMutationStatus === 'pending'; // Check mutation status

  const [expanded, setExpanded] = useState(false);

  // Redux selector
  const sessionFocus = useAppSelector(selectSessionFocus);

  return (
    <Fragment>
      {/* Static Relative Wrapper for Positioning and Clipping - No longer needs overflow-hidden if card doesn't move */}
      <div className="relative rounded-lg">
        {/* Card Area - Removed motion.div wrapper and its drag props */}
        <Card className="w-full rounded-lg border-0 shadow-none bg-transparent p-0 md:border md:shadow md:bg-card md:rounded-lg">
          <motion.div // Added motion.div here for long press on header
            onPointerDown={handlePointerDown}
            onPointerUp={clearLongPressTimer}
            onPointerLeave={clearLongPressTimer} // Clear timer if pointer leaves the element
            // Optionally, add visual feedback for press:
            // whileTap={{ scale: 0.98, backgroundColor: "rgba(0,0,0,0.05)" }} 
            // style={{ touchAction: 'pan-y' }} // Allow vertical scroll if header is part of a scrollable list
            className="cursor-pointer" // Indicate interactivity
          >
            <CardHeader className="flex flex-row justify-between items-center gap-2 p-0 md:p-2 md:sm:p-4">
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
                      {/* Display the string directly, provide fallback */}
                      {workoutExercise.equipmentType || "Select Equip."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1">
                    <div className="flex flex-col gap-1">
                      {/* Iterate over the string choices */}
                      {EQUIPMENT_CHOICES.map((choice) => (
                        <Button
                          key={choice}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 px-2 text-xs"
                          onClick={() => {
                            // Pass the string choice directly
                            onEquipmentChange(choice);
                            setEquipmentOpen(false);
                          }}
                          // Compare with the string choice
                          disabled={workoutExercise.equipmentType === choice}
                        >
                          {/* Display the string choice */}
                          {choice}
                        </Button>
                      ))}
                      {/* Add New Equipment Button / Input */}
                      {showNewEquipmentInput ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            type="text"
                            placeholder="New Equipment"
                            value={newEquipmentName}
                            onChange={(e) => setNewEquipmentName(e.target.value)}
                            className="h-8 px-2 text-xs flex-grow"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newEquipmentName.trim()) {
                                onEquipmentChange(newEquipmentName.trim());
                                setNewEquipmentName("");
                                setShowNewEquipmentInput(false);
                                setEquipmentOpen(false);
                              } else if (e.key === 'Escape') {
                                setNewEquipmentName("");
                                setShowNewEquipmentInput(false);
                              }
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              if (newEquipmentName.trim()) {
                                onEquipmentChange(newEquipmentName.trim());
                                setNewEquipmentName("");
                                setShowNewEquipmentInput(false);
                                setEquipmentOpen(false);
                              }
                            }}
                            disabled={!newEquipmentName.trim()}
                          >
                            <Check size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setNewEquipmentName("");
                              setShowNewEquipmentInput(false);
                            }}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 px-2 text-xs text-primary mt-1"
                          onClick={() => {
                            setShowNewEquipmentInput(true);
                            setNewEquipmentName(""); // Clear any previous input
                            // Do not call onEquipmentChange('add_new');
                            // Do not close popover here, allow input first
                          }}
                        >
                          <Plus size={14} className="mr-1" /> Add New
                        </Button>
                      )}
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
                          className="w-full justify-start h-8 px-2 text-xs text-primary mt-1"
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
          </motion.div>

          <CardContent className="p-0 pt-0 md:pt-0 md:pb-2 md:px-2 md:sm:px-4">
            <div className="">
              {/* Enhanced zone indicator for cardio exercises */}
              {isCardioExercise(workoutExercise.exercise) && (
                <CardioZoneIndicator sessionFocus={sessionFocus} />
              )}

              <Table className="w-full">
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-[35px] text-center px-1 py-1">Set</TableHead>
                    <TableHead className="w-[70px] text-center px-1 py-1">Previous</TableHead>

                    {isCardioExercise(workoutExercise.exercise) ? (
                      // Cardio exercise headers
                      <>
                        <TableHead className="w-[75px] text-center px-1 py-1">Duration</TableHead>
                        <TableHead className="w-[75px] text-center px-1 py-1">Distance</TableHead>
                      </>
                    ) : (
                      // Strength exercise headers
                      <>
                        <TableHead className="w-[75px] text-center px-1 py-1">Weight</TableHead>
                        {isExerciseStatic ? (
                          <TableHead className="w-[60px] text-center px-1 py-1">Time</TableHead>
                        ) : (
                          <TableHead className="w-[60px] text-center px-1 py-1">Reps</TableHead>
                        )}
                      </>
                    )}

                    <TableHead className="w-[40px] p-0 text-center"><Check size={16} className="mx-auto" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
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
                          isStatic={isExerciseStatic}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: 'tween', duration: 0.5 }}
                          layout
                        />
                      );
                    })}
                    <motion.tr
                      key="add-set-row"
                      layout={false}
                      className="border-b-0"
                    >
                      <TableCell className="p-1 text-center align-middle">
                        <Button variant="ghost" size="icon" onClick={onAddSet} className="h-7 w-7" aria-label="Add set">
                          <Plus size={16} />
                        </Button>
                      </TableCell>
                      <TableCell className="p-1 align-middle"></TableCell>

                      {isCardioExercise(workoutExercise.exercise) ? (
                        // Cardio exercise add-set controls
                        <>
                          <TableCell className="p-1 align-middle">
                            <div className="flex items-center justify-center">
                              <SwipeableIncrementer
                                onAdjust={(adjustment) => onUpdateLastSet('time', adjustment * 30)} // 30 second increments
                                smallStepPositive={1}
                                smallStepNegative={-1}
                                swipeUpStep={2}
                                swipeDownStep={-2}
                                swipeRightStep={4}
                                swipeLeftStep={-4}
                                disabled={workoutExercise.sets.length === 0}
                                label="Adjust duration of last set"
                                buttonSize="sm"
                                iconSize={14}
                                buttonClassName="hover:bg-transparent h-6 w-6"
                                wrapperClassName="gap-1"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="p-1 align-middle">
                            <div className="flex items-center justify-center">
                              <SwipeableIncrementer
                                onAdjust={(adjustment) => onUpdateLastSet('distance', adjustment * 0.1)} // 0.1 km increments
                                smallStepPositive={1}
                                smallStepNegative={-1}
                                swipeUpStep={5}
                                swipeDownStep={-5}
                                swipeRightStep={10}
                                swipeLeftStep={-10}
                                disabled={workoutExercise.sets.length === 0}
                                label="Adjust distance of last set"
                                buttonSize="sm"
                                iconSize={14}
                                buttonClassName="hover:bg-transparent h-6 w-6"
                                wrapperClassName="gap-1"
                              />
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        // Strength exercise add-set controls
                        <>
                          <TableCell className="p-1 align-middle">
                            <div className="flex items-center justify-center">
                              <SwipeableIncrementer
                                onAdjust={(adjustment) => onUpdateLastSet('weight', adjustment)}
                                smallStepPositive={1}
                                smallStepNegative={-1}
                                swipeUpStep={5}
                                swipeDownStep={-5}
                                swipeRightStep={2.5}
                                swipeLeftStep={-2.5}
                                disabled={workoutExercise.sets.length === 0}
                                label="Adjust weight of last set"
                                buttonSize="sm"
                                iconSize={14}
                                buttonClassName="hover:bg-transparent h-6 w-6"
                                wrapperClassName="gap-1"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="p-1 align-middle">
                            <div className="flex items-center justify-center">
                              <SwipeableIncrementer
                                onAdjust={(adjustment) => onUpdateLastSet(isExerciseStatic ? 'time' : 'reps', adjustment)}
                                smallStepPositive={1}
                                smallStepNegative={-1}
                                swipeUpStep={isExerciseStatic ? 5 : 10}
                                swipeDownStep={isExerciseStatic ? -5 : -10}
                                swipeRightStep={isExerciseStatic ? 2 : 5}
                                swipeLeftStep={isExerciseStatic ? -2 : -5}
                                disabled={workoutExercise.sets.length === 0}
                                label={isExerciseStatic ? "Adjust time of last set" : "Adjust reps of last set"}
                                buttonSize="sm"
                                iconSize={14}
                                buttonClassName="hover:bg-transparent h-6 w-6"
                                wrapperClassName="gap-1"
                              />
                            </div>
                          </TableCell>
                        </>
                      )}

                      <TableCell className="p-1 align-middle"></TableCell>
                    </motion.tr>
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        {/* REMOVED Stationary Delete Button Area */}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmDialog && (
        <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard Exercise</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove "{workoutExercise.exercise.name}" from your workout?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirmed}>
                Discard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Fragment>
  );
};