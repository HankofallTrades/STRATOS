import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/core/button";
import { Plus, Search, Trash2 } from "lucide-react";
import { Label } from "@/components/core/label";
import { Input } from "@/components/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/core/Dialog";
import { Exercise, ExerciseCategory } from "@/lib/types/workout";
import { cn } from "@/lib/utils/cn";
import { Switch } from "@/components/core/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/core/select";
import { useExerciseSelector } from '../hooks/useExerciseSelector';
import {
  workoutDialogClassName,
  workoutMenuInputClassName,
  workoutMenuOptionClassName,
  workoutMenuPrimaryButtonClassName,
  workoutMenuSectionClassName,
  workoutMenuSecondaryButtonClassName,
  workoutMenuSelectContentClassName,
  workoutMenuSelectItemClassName,
  workoutMenuSelectTriggerClassName,
} from './workoutSelectionStyles';

const LONG_PRESS_DURATION = 500;

interface ExerciseSelectorProps {
  openOnMount?: boolean;
  iconOnly?: boolean;
  trigger?: React.ReactNode;
  mode?: 'add' | 'replace';
  targetWorkoutExerciseId?: string;
  setCount?: number;
  disabledExerciseId?: string;
}

// Helper function to format archetype names
const formatArchetypeName = (name: string): string => {
  if (!name) return "";
  const parts = name.split('_');
  const firstPart = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  if (parts.length > 1) {
    const secondPart = parts.slice(1).join(' ');
    return `${firstPart} (${secondPart})`;
  }
  return firstPart;
};

const CATEGORY_OPTIONS: { value: ExerciseCategory; label: string }[] = [
  { value: 'weights', label: 'Weights' },
  { value: 'calisthenics', label: 'Calisthenics' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'stability', label: 'Stability' },
];

const CATEGORY_BADGE_STYLES: Record<ExerciseCategory, string> = {
  weights: 'bg-white/[0.06] text-foreground/50',
  calisthenics: 'bg-amber-500/10 text-amber-400/70',
  cardio: 'bg-sky-500/10 text-sky-400/70',
  mobility: 'bg-emerald-500/10 text-emerald-400/70',
  stability: 'bg-violet-500/10 text-violet-400/70',
};

const ExerciseSelector = ({
  openOnMount = false,
  iconOnly = false,
  trigger,
  mode = 'add',
  targetWorkoutExerciseId,
  setCount,
  disabledExerciseId,
}: ExerciseSelectorProps) => {
  const [open, setOpen] = useState(openOnMount);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    exercises,
    archetypes,
    searchQuery,
    isAddingNew,
    newExerciseName,
    isStaticNewExercise,
    selectedArchetypeId,
    categoryFilter,
    newExerciseCategory,
    isLoading,
    isLoadingArchetypes,
    isPending,
    setSearchQuery,
    setIsAddingNew,
    setNewExerciseName,
    setIsStaticNewExercise,
    setSelectedArchetypeId,
    setCategoryFilter,
    setNewExerciseCategory,
    selectExercise,
    removeExercise,
    handleCreate
  } = useExerciseSelector(open, {
    mode,
    workoutExerciseId: targetWorkoutExerciseId,
    setCount,
  });

  const handlePointerDown = (exercise: Exercise) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setExerciseToDelete(exercise);
      setIsConfirmDeleteDialogOpen(true);
      longPressTimerRef.current = null;
    }, LONG_PRESS_DURATION);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleSelect = async (exercise: Exercise) => {
    await selectExercise(exercise);
    setOpen(false);
  };

  const handleConfirmRemove = () => {
    if (exerciseToDelete) {
      removeExercise(exerciseToDelete);
      setIsConfirmDeleteDialogOpen(false);
      setExerciseToDelete(null);
    }
  };

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setIsAddingNew(false);
      setNewExerciseName("");
      setIsStaticNewExercise(false);
      setSelectedArchetypeId(null);
      setCategoryFilter(null);
      setNewExerciseCategory(null);
      setIsSearchFocused(false);
      clearLongPressTimer();
      setExerciseToDelete(null);
    }
  }, [open, setSearchQuery, setIsAddingNew, setNewExerciseName, setIsStaticNewExercise, setSelectedArchetypeId, setCategoryFilter, setNewExerciseCategory]);

  return (
    <div className={trigger ? "" : "flex justify-end"}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : iconOnly ? (
            <Button
              variant="ghost"
              size="icon"
              className="verdigris-text h-8 w-8 rounded-[10px] border-0 bg-transparent p-0 shadow-none transition-colors hover:bg-transparent hover:text-foreground"
            >
              <Plus size={24} strokeWidth={2.5} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="h-10 rounded-[10px] border-0 bg-transparent px-0 text-foreground/72 shadow-none hover:bg-transparent hover:text-foreground"
            >
              <Plus size={16} className="mr-2" />
              Add Exercise
            </Button>
          )}
        </DialogTrigger>
        <DialogContent
          className={cn(
            workoutDialogClassName,
            isSearchFocused
              ? "!top-4 !translate-y-0 sm:!top-[50%] sm:!translate-y-[-50%]"
              : "!left-0 !top-0 !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 rounded-none p-4 sm:!left-[50%] sm:!top-[50%] sm:!h-auto sm:!w-full sm:!max-w-md sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:rounded-[28px] sm:p-5"
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (isConfirmDeleteDialogOpen) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              {mode === 'replace' ? 'Change Exercise' : 'Select Exercise'}
            </DialogTitle>
          </DialogHeader>
          <div className={cn("space-y-4 pt-4", !isSearchFocused && "flex min-h-0 flex-1 flex-col")}>
            {/* Category filter chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryFilter(null)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  !categoryFilter
                    ? "bg-white/[0.1] text-foreground"
                    : "bg-white/[0.03] text-muted-foreground hover:text-foreground/80"
                )}
              >
                All
              </button>
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(categoryFilter === cat.value ? null : cat.value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    categoryFilter === cat.value
                      ? CATEGORY_BADGE_STYLES[cat.value]
                      : "bg-white/[0.03] text-muted-foreground hover:text-foreground/80"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/75" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={`${workoutMenuInputClassName} pl-11`}
              />
            </div>

            <div
              className={cn(
                "stone-surface space-y-1 overflow-y-auto rounded-[18px] p-2 sm:max-h-72",
                isSearchFocused ? "max-h-40" : "min-h-0 flex-1"
              )}
            >
              {isLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Loading exercises...</p>
              ) : exercises.length > 0 ? (
                exercises.map((exercise) => (
                  <Button
                    key={exercise.id}
                    variant="ghost"
                    onClick={() => handleSelect(exercise)}
                    onPointerDown={() => handlePointerDown(exercise)}
                    onPointerUp={clearLongPressTimer}
                    onPointerLeave={clearLongPressTimer}
                    onTouchStart={() => handlePointerDown(exercise)}
                    onTouchEnd={clearLongPressTimer}
                    onTouchCancel={clearLongPressTimer}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setExerciseToDelete(exercise);
                      setIsConfirmDeleteDialogOpen(true);
                    }}
                    disabled={exercise.id === disabledExerciseId}
                    className={`${workoutMenuOptionClassName} h-11 select-none justify-start px-4 text-sm ${
                      exercise.id === disabledExerciseId ? "bg-white/[0.03]" : ""
                    }`}
                    style={{ WebkitTouchCallout: 'none' }}
                  >
                    <span className="truncate">{exercise.name}</span>
                    {exercise.exercise_category && exercise.exercise_category !== 'weights' && (
                      <span className={cn(
                        "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        CATEGORY_BADGE_STYLES[exercise.exercise_category as ExerciseCategory] ?? "bg-white/[0.06] text-foreground/50"
                      )}>
                        {CATEGORY_OPTIONS.find(c => c.value === exercise.exercise_category)?.label ?? exercise.exercise_category}
                      </span>
                    )}
                  </Button>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No matching exercises found</p>
              )}
            </div>

            {isAddingNew ? (
              <div className={`${workoutMenuSectionClassName} space-y-3`}>
                <div className="space-y-1">
                  <Label htmlFor="new-exercise" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">New Exercise Name</Label>
                  <Input
                    id="new-exercise"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    placeholder="Enter exercise name"
                    className={workoutMenuInputClassName}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1 pt-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Category</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setNewExerciseCategory(newExerciseCategory === cat.value ? null : cat.value)}
                        disabled={isPending}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                          newExerciseCategory === cat.value
                            ? CATEGORY_BADGE_STYLES[cat.value]
                            : "bg-white/[0.03] text-muted-foreground hover:text-foreground/80"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-end space-x-4 pt-2">
                  <div className="flex-grow space-y-1">
                    <Label htmlFor="movement-type-select" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Movement</Label>
                    <Select
                      value={selectedArchetypeId ?? undefined}
                      onValueChange={setSelectedArchetypeId}
                      disabled={isLoadingArchetypes || isPending}
                    >
                      <SelectTrigger id="movement-type-select" className={workoutMenuSelectTriggerClassName}>
                        <SelectValue placeholder={isLoadingArchetypes ? "Loading..." : "Select movement..."} />
                      </SelectTrigger>
                      <SelectContent className={workoutMenuSelectContentClassName}>
                        {archetypes.map(archetype => (
                          <SelectItem key={archetype.id} value={archetype.id} className={workoutMenuSelectItemClassName}>
                            {formatArchetypeName(archetype.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-shrink-0 space-y-1 pb-1">
                    <Label htmlFor="timed-toggle" className="block text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Timed
                    </Label>
                    <div className="flex justify-center">
                      <Switch
                        id="timed-toggle"
                        checked={isStaticNewExercise}
                        onCheckedChange={setIsStaticNewExercise}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 pt-3">
                  <Button
                    variant="ghost"
                    className={`${workoutMenuSecondaryButtonClassName} flex-1`}
                    onClick={() => setIsAddingNew(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    className={`${workoutMenuPrimaryButtonClassName} flex-1`}
                    onClick={handleCreate}
                    disabled={!newExerciseName.trim() || !selectedArchetypeId || isPending}
                  >
                    {isPending ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className={`${workoutMenuSecondaryButtonClassName} w-full`}
                onClick={() => setIsAddingNew(true)}
                disabled={isPending}
              >
                <Plus size={16} className="mr-2" />
                Create New Exercise
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <DialogContent className={`${workoutDialogClassName} sm:max-w-xs`}>
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">Remove Exercise</DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              Remove "{exerciseToDelete?.name}"?
              {exerciseToDelete?.created_by_user_id ? " This will permanently delete your custom exercise." : " This will hide it from your list."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsConfirmDeleteDialogOpen(false)}
              disabled={isPending}
              className={workoutMenuSecondaryButtonClassName}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              onClick={handleConfirmRemove}
              disabled={isPending}
              className="h-11 rounded-[16px] bg-rose-500/16 text-rose-200 hover:bg-rose-500/24 hover:text-rose-100"
            >
              {isPending ? 'Removing...' : <><Trash2 size={16} className="mr-2" /> Remove</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExerciseSelector;
