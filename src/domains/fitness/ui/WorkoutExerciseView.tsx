import React, { Fragment, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RecommendedStrengthSetPerformance } from '../data/recommendations';
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
import { Plus, Check, X, Heart, Zap, ChevronDown, Trash2 } from 'lucide-react';
import SetComponent from './SetComponent'; // Assuming SetComponent exists in the same directory
import ExerciseSelector from './ExerciseSelector';
// Removed Supabase function imports
import { Input } from '@/components/core/input'; // Import Input component
import { cn } from '@/lib/utils/cn'; // Import cn utility
// ADD ToggleGroup imports
// import { ToggleGroup, ToggleGroupItem } from '@/components/core/Toggle/toggle-group';
import SwipeableIncrementer from '@/components/core/Controls/SwipeableIncrementer'; // Added import
import RestTimer from './RestTimer';
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
import {
  workoutMenuInputClassName,
  workoutMenuOptionClassName,
  workoutPopoverClassName,
} from './workoutSelectionStyles';

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
  historicalSetPerformances: Record<number, { weight: number; reps: number | null; time_seconds?: number | null } | null>; // Updated for time
  recommendedSetPerformances: Record<number, RecommendedStrengthSetPerformance | null>;
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
  onUpdateLastSet: (field: 'weight' | 'reps' | 'time' | 'distance', change: number) => void;
  restStartTime: number | null;
}

const DEFAULT_VARIATION = 'Standard'; // Define default variation

const SWIPE_REVEAL_WIDTH = 84;
const SWIPE_DIRECTION_LOCK_DISTANCE = 10;
const CARD_SWIPE_BLOCK_SELECTOR =
  'button, input, textarea, select, a, [contenteditable="true"], [data-card-swipe-block]';

type SwipeGestureState = {
  pointerId: number;
  startX: number;
  startY: number;
  baseOffset: number;
  direction: 'pending' | 'horizontal' | 'vertical';
};

// Helper component for cardio zone indicators
const CardioZoneIndicator: React.FC<{ sessionFocus?: string | null }> = ({ sessionFocus }) => {
  const getZoneInfo = (focus: string | null) => {
    switch (focus) {
      case 'zone2':
        return {
          title: 'Zone 2 Cardio',
          description: 'Aerobic base building (60-70% HR)',
          color: 'verdigris-emblem',
          textColor: 'verdigris-text',
          bgColor: 'stone-surface',
          icon: <Heart className="h-4 w-4" />
        };
      case 'zone5':
        return {
          title: 'Zone 5 Cardio',
          description: 'High intensity (90-100% HR)',
          color: 'warm-metal-emblem',
          textColor: 'warm-metal-text',
          bgColor: 'stone-surface',
          icon: <Zap className="h-4 w-4" />
        };
      default:
        return {
          title: 'Cardio Exercise',
          description: 'Track duration and distance',
          color: 'verdigris-emblem',
          textColor: 'verdigris-text',
          bgColor: 'stone-surface',
          icon: <Heart className="h-4 w-4" />
        };
    }
  };

  const zoneInfo = getZoneInfo(sessionFocus);

  return (
    <div className={cn("mb-3 rounded-[20px] p-2.5", zoneInfo.bgColor)}>
      <div className="flex items-center gap-2">
        <div className={cn("shrink-0", zoneInfo.textColor)}>{zoneInfo.icon}</div>
        <div>
          <div className={cn("text-sm font-medium", zoneInfo.textColor)}>
            {zoneInfo.title}
          </div>
          <div className="text-xs text-muted-foreground">
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
  historicalSetPerformances,
  recommendedSetPerformances,
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
  restStartTime,
}: WorkoutExerciseViewProps) => {
  // State for Popover open state
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [variationOpen, setVariationOpen] = useState(false);
  const [showNewEquipmentInput, setShowNewEquipmentInput] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [cardSwipeOffset, setCardSwipeOffset] = useState(0);
  const [isCardSwiping, setIsCardSwiping] = useState(false);
  const [isDeleteActionRevealed, setIsDeleteActionRevealed] = useState(false);

  const cardSwipeGestureRef = useRef<SwipeGestureState | null>(null);
  const cardSwipeOffsetRef = useRef(0);
  const didMoveDuringSwipeRef = useRef(false);
  const suppressNextCardClickRef = useRef(false);

  // REMOVED Motion value and transform
  // const cardX = useMotionValue(0);
  // const deleteOpacity = useTransform(...);

  const isExerciseStatic = useMemo(() => workoutExercise.exercise.is_static ?? false, [workoutExercise.exercise.is_static]);

  // --- Handlers ---
  // REMOVED handleReveal, handleHide, handleDragEnd
  const updateCardSwipeOffset = (nextOffset: number) => {
    cardSwipeOffsetRef.current = nextOffset;
    setCardSwipeOffset(nextOffset);
  };

  const isCardSwipeBlockedTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    target.closest(CARD_SWIPE_BLOCK_SELECTOR) !== null;

  const revealDeleteAction = () => {
    setIsDeleteActionRevealed(true);
    updateCardSwipeOffset(-SWIPE_REVEAL_WIDTH);
  };

  const closeDeleteAction = () => {
    setIsDeleteActionRevealed(false);
    updateCardSwipeOffset(0);
  };

  const releaseCardPointerCapture = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const finishCardSwipe = (cancelled = false) => {
    const shouldRevealDeleteAction = cancelled
      ? isDeleteActionRevealed
      : cardSwipeOffsetRef.current <= -(SWIPE_REVEAL_WIDTH / 2);

    suppressNextCardClickRef.current = didMoveDuringSwipeRef.current;
    didMoveDuringSwipeRef.current = false;
    cardSwipeGestureRef.current = null;
    setIsCardSwiping(false);

    if (shouldRevealDeleteAction) {
      revealDeleteAction();
      return;
    }

    closeDeleteAction();
  };

  const handleCardPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0 || isCardSwipeBlockedTarget(event.target)) {
      return;
    }

    event.preventDefault();

    cardSwipeGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseOffset: cardSwipeOffsetRef.current,
      direction: 'pending',
    };

    didMoveDuringSwipeRef.current = false;
    setIsCardSwiping(false);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional here; browsers that reject it still swipe correctly.
    }
  };

  const handleCardPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const gesture = cardSwipeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const absoluteDeltaX = Math.abs(deltaX);
    const absoluteDeltaY = Math.abs(deltaY);

    if (gesture.direction === 'pending') {
      if (
        absoluteDeltaX < SWIPE_DIRECTION_LOCK_DISTANCE &&
        absoluteDeltaY < SWIPE_DIRECTION_LOCK_DISTANCE
      ) {
        return;
      }

      gesture.direction =
        absoluteDeltaX > absoluteDeltaY ? 'horizontal' : 'vertical';
    }

    if (gesture.direction !== 'horizontal') {
      return;
    }

    event.preventDefault();
    didMoveDuringSwipeRef.current = true;
    setIsCardSwiping(true);
    updateCardSwipeOffset(
      Math.round(
        Math.max(-SWIPE_REVEAL_WIDTH, Math.min(0, gesture.baseOffset + deltaX))
      )
    );
  };

  const handleCardPointerUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const gesture = cardSwipeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    releaseCardPointerCapture(event);
    finishCardSwipe();
  };

  const handleCardPointerCancel = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const gesture = cardSwipeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    releaseCardPointerCapture(event);
    finishCardSwipe(true);
  };

  const handleDeleteExercise = () => {
    closeDeleteAction();
    onDeleteExercise();
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isCardSwiping) {
      root.classList.add('gesture-lock');
      body.classList.add('gesture-lock');
      return () => {
        root.classList.remove('gesture-lock');
        body.classList.remove('gesture-lock');
      };
    }

    root.classList.remove('gesture-lock');
    body.classList.remove('gesture-lock');

    return undefined;
  }, [isCardSwiping]);

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressNextCardClickRef.current) {
      suppressNextCardClickRef.current = false;
      return;
    }

    if (
      !isDeleteActionRevealed ||
      isCardSwiping ||
      isCardSwipeBlockedTarget(event.target)
    ) {
      return;
    }

    closeDeleteAction();
  };

  const completedSetCount = useMemo(
    () => workoutExercise.sets.filter((set) => set.completed).length,
    [workoutExercise.sets]
  );
  const firstIncompleteSetIndex = useMemo(
    () => workoutExercise.sets.findIndex((set) => !set.completed),
    [workoutExercise.sets]
  );

  // --- Memos ---
  // Removed sortedEquipmentTypes useMemo hook
  // const sortedEquipmentTypes = useMemo(() => { ... });

  // --- Render ---
  // Removed variationsError check (handled in container)

  // Determine placeholder for variation select using props
  const isSavingVariation = addVariationMutationStatus === 'pending'; // Check mutation status

  // Redux selector
  const sessionFocus = useAppSelector(selectSessionFocus);
  const canReplaceExercise = completedSetCount === 0;
  const swipeDeleteProgress = Math.min(
    1,
    Math.abs(cardSwipeOffset) / SWIPE_REVEAL_WIDTH
  );
  const chipButtonClassName =
    "h-8 rounded-[10px] border-0 bg-white/[0.03] px-2.5 text-[13px] font-medium text-foreground/76 shadow-none hover:bg-white/[0.05] hover:text-foreground";

  return (
    <Fragment>
      <section className="overflow-x-hidden pb-6">
        <div className="relative w-full max-w-full overflow-hidden rounded-[20px] [contain:paint]">
          <div
            className="absolute inset-y-0 right-0 flex w-[84px] items-center justify-center bg-white/[0.03] transition-opacity duration-200"
            style={{ opacity: swipeDeleteProgress === 0 ? 0 : 1 }}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-[12px] px-3 text-[13px] font-medium text-foreground/72 hover:bg-white/[0.04] hover:text-foreground"
              onClick={handleDeleteExercise}
              disabled={!isDeleteActionRevealed}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>

          <div
            onPointerDown={handleCardPointerDown}
            onPointerMove={handleCardPointerMove}
            onPointerUp={handleCardPointerUp}
            onPointerCancel={handleCardPointerCancel}
            onClick={handleCardClick}
            className={cn(
              "relative max-w-full touch-pan-y select-none [contain:paint] [&_input]:select-text [&_textarea]:select-text",
              isCardSwiping
                ? "select-none cursor-grabbing"
                : "transition-transform duration-200 ease-out"
            )}
            style={{ transform: `translate3d(${cardSwipeOffset}px, 0, 0)` }}
            onDragStart={(event) => event.preventDefault()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {canReplaceExercise ? (
                  <ExerciseSelector
                    trigger={
                      <button
                        type="button"
                        className="group flex min-w-0 items-center gap-2 text-left"
                      >
                        <span className="truncate text-[clamp(1.8rem,5vw,2.4rem)] font-semibold leading-none tracking-tight text-foreground">
                          {workoutExercise.exercise.name}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground/80" />
                      </button>
                    }
                    mode="replace"
                    targetWorkoutExerciseId={workoutExercise.id}
                    setCount={Math.max(workoutExercise.sets.length, 1)}
                    disabledExerciseId={workoutExercise.exerciseId}
                  />
                ) : (
                  <h2 className="truncate text-[clamp(1.8rem,5vw,2.4rem)] font-semibold leading-none tracking-tight text-foreground">
                    {workoutExercise.exercise.name}
                  </h2>
                )}
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Popover open={equipmentOpen} onOpenChange={setEquipmentOpen}>
                <PopoverTrigger asChild onPointerDownCapture={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className={chipButtonClassName}>
                    <span>{workoutExercise.equipmentType || "Select Equip."}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={cn(workoutPopoverClassName, "w-[220px]")}>
                  <div className="flex flex-col gap-1">
                    {EQUIPMENT_CHOICES.map((choice) => (
                      <Button
                        key={choice}
                        variant="ghost"
                        size="sm"
                        className={workoutMenuOptionClassName}
                        onClick={() => {
                          onEquipmentChange(choice);
                          setEquipmentOpen(false);
                        }}
                        disabled={workoutExercise.equipmentType === choice}
                      >
                        {choice}
                      </Button>
                    ))}
                    {showNewEquipmentInput ? (
                      <div className="mt-2 border-t border-white/8 pt-2">
                        <div className="flex items-center gap-1">
                          <Input
                            type="text"
                            placeholder="New Equipment"
                            value={newEquipmentName}
                            onChange={(e) => setNewEquipmentName(e.target.value)}
                            className={cn(workoutMenuInputClassName, "h-10 flex-grow px-3 text-xs")}
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
                            className="verdigris-emblem h-10 w-10 rounded-[14px] p-0 hover:bg-white/[0.04]"
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
                            className="stone-chip h-10 w-10 rounded-[14px] p-0 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                            onClick={() => {
                              setNewEquipmentName("");
                              setShowNewEquipmentInput(false);
                            }}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 border-t border-white/8 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(workoutMenuOptionClassName, "verdigris-text hover:text-foreground")}
                          onClick={() => {
                            setShowNewEquipmentInput(true);
                            setNewEquipmentName("");
                          }}
                        >
                          <Plus size={14} className="mr-1" /> Add New
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {!isAddingVariation ? (
                <Popover open={variationOpen} onOpenChange={setVariationOpen}>
                  <PopoverTrigger asChild onPointerDownCapture={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={chipButtonClassName}
                      disabled={isLoadingVariations || isSavingVariation}
                    >
                      <span>{isLoadingVariations ? "Loading..." : (selectedVariation ?? DEFAULT_VARIATION)}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={cn(workoutPopoverClassName, "w-[220px]")}>
                    <div className="flex flex-col gap-1">
                      {variations?.map((variation) => (
                        <Button
                          key={variation}
                          variant="ghost"
                          size="sm"
                          className={workoutMenuOptionClassName}
                          onClick={() => {
                            onVariationChange(variation);
                            setVariationOpen(false);
                          }}
                          disabled={selectedVariation === variation || (selectedVariation === undefined && variation === DEFAULT_VARIATION)}
                        >
                          {variation}
                        </Button>
                      ))}
                      <div className="mt-2 border-t border-white/8 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(workoutMenuOptionClassName, "verdigris-text hover:text-foreground")}
                          onClick={() => {
                            onVariationChange('add_new');
                            setVariationOpen(false);
                          }}
                        >
                          <Plus size={14} className="mr-1" /> Add New
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex flex-shrink-0 items-center gap-1">
                  <Input
                    type="text"
                    placeholder="New Variation"
                    value={newVariationName}
                    onChange={(e) => onNewVariationNameChange(e.target.value)}
                    className={cn(workoutMenuInputClassName, "h-10 w-[140px] sm:w-[160px] text-xs")}
                    disabled={isSavingVariation}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="verdigris-emblem h-10 w-10 flex-shrink-0 rounded-[14px] hover:bg-white/[0.04]"
                    onClick={onSaveNewVariation}
                    disabled={!newVariationName.trim() || newVariationName.trim().toLowerCase() === DEFAULT_VARIATION.toLowerCase() || isSavingVariation}
                    aria-label="Save new variation"
                  >
                    {isSavingVariation ? <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div> : <Check size={16} />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="stone-chip h-10 w-10 flex-shrink-0 rounded-[14px] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                    onClick={onCancelAddVariation}
                    disabled={isSavingVariation}
                    aria-label="Cancel adding variation"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
            </div>

            {isCardioExercise(workoutExercise.exercise) && (
              <CardioZoneIndicator sessionFocus={sessionFocus} />
            )}

            <div>
              <div className="stone-surface overflow-hidden rounded-[18px]">
                <Table className="w-full">
                  <TableHeader className="stone-table-head">
                    <TableRow className="stone-seam border-b hover:bg-transparent">
                      <TableHead className="w-[42px] px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Set</TableHead>

                      {isCardioExercise(workoutExercise.exercise) ? (
                        <>
                          <TableHead className="w-[88px] px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Duration</TableHead>
                          <TableHead className="w-[88px] px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Distance</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="w-[92px] px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Weight</TableHead>
                          <TableHead className="w-[84px] px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            {isExerciseStatic ? 'Time' : 'Reps'}
                          </TableHead>
                        </>
                      )}

                      <TableHead className="w-[52px] px-0 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground" />
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
                            recommendedPerformance={recommendedSetPerformances?.[setNumber] ?? null}
                            userBodyweight={userBodyweight}
                            isStatic={isExerciseStatic}
                            isActive={firstIncompleteSetIndex === -1 ? index === workoutExercise.sets.length - 1 : index === firstIncompleteSetIndex}
                            onComplete={onAddSet}
                            initial={{ opacity: 0, height: 0, y: 16 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            layout
                          />
                        );
                      })}
                      <motion.tr
                        key="add-set-row"
                        layout={false}
                        className="stone-seam border-t bg-white/[0.015]"
                      >
                        <TableCell className="px-2 py-3 text-center align-middle">
                          <div className="flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={onAddSet}
                              className="h-8 rounded-[10px] border-0 bg-transparent px-2 text-[13px] font-medium text-foreground/72 shadow-none hover:bg-transparent hover:text-foreground"
                              aria-label="Add set"
                            >
                              <Plus size={15} />
                            </Button>
                          </div>
                        </TableCell>

                        {isCardioExercise(workoutExercise.exercise) ? (
                          <>
                            <TableCell className="px-2 py-3 align-middle">
                              <div className="flex items-center justify-center">
                                <SwipeableIncrementer
                                  onAdjust={(adjustment) => onUpdateLastSet('time', adjustment * 30)}
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
                                  buttonClassName="h-7 w-7 rounded-[10px] border-0 bg-transparent text-foreground/62 shadow-none hover:bg-transparent hover:text-foreground"
                                  wrapperClassName="gap-1"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="px-2 py-3 align-middle">
                              <div className="flex items-center justify-center">
                                <SwipeableIncrementer
                                  onAdjust={(adjustment) => onUpdateLastSet('distance', adjustment * 0.1)}
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
                                  buttonClassName="h-7 w-7 rounded-[10px] border-0 bg-transparent text-foreground/62 shadow-none hover:bg-transparent hover:text-foreground"
                                  wrapperClassName="gap-1"
                                />
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="px-2 py-3 align-middle">
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
                                  buttonClassName="h-7 w-7 rounded-[10px] border-0 bg-transparent text-foreground/62 shadow-none hover:bg-transparent hover:text-foreground"
                                  wrapperClassName="gap-1"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="px-2 py-3 align-middle">
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
                                  buttonClassName="h-7 w-7 rounded-[10px] border-0 bg-transparent text-foreground/62 shadow-none hover:bg-transparent hover:text-foreground"
                                  wrapperClassName="gap-1"
                                />
                              </div>
                            </TableCell>
                          </>
                        )}

                        <TableCell className="px-0 py-3 align-middle">
                          {restStartTime && (
                            <div className="flex items-center justify-center">
                              <RestTimer startTime={restStartTime} />
                            </div>
                          )}
                        </TableCell>
                      </motion.tr>
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Fragment>
  );
};
