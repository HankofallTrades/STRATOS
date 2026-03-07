import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/core/button";
import { Plus, Search, Trash2 } from "lucide-react";
import { Label } from "@/components/core/label";
import { Input } from "@/components/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/core/Dialog";
import { Exercise } from "@/lib/types/workout";
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
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    exercises,
    archetypes,
    searchQuery,
    isAddingNew,
    newExerciseName,
    isStaticNewExercise,
    selectedArchetypeId,
    isLoading,
    isLoadingArchetypes,
    isPending,
    setSearchQuery,
    setIsAddingNew,
    setNewExerciseName,
    setIsStaticNewExercise,
    setSelectedArchetypeId,
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
      clearLongPressTimer();
      setExerciseToDelete(null);
    }
  }, [open, setSearchQuery, setIsAddingNew, setNewExerciseName, setIsStaticNewExercise, setSelectedArchetypeId]);

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
          className={workoutDialogClassName}
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
          <div className="space-y-4 pt-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/75" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${workoutMenuInputClassName} pl-11`}
              />
            </div>

            <div className="stone-surface max-h-72 space-y-1 overflow-y-auto rounded-[18px] p-2">
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
                    {exercise.name}
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

                <div className="flex items-end space-x-4 pt-2">
                  <div className="flex-grow space-y-1">
                    <Label htmlFor="movement-type-select" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Type</Label>
                    <Select
                      value={selectedArchetypeId ?? undefined}
                      onValueChange={setSelectedArchetypeId}
                      disabled={isLoadingArchetypes || isPending}
                    >
                      <SelectTrigger id="movement-type-select" className={workoutMenuSelectTriggerClassName}>
                        <SelectValue placeholder={isLoadingArchetypes ? "Loading types..." : "Select type..."} />
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
