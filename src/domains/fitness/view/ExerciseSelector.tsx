import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/core/button";
import { Plus, Search, Trash2 } from "lucide-react";
import { Label } from "@/components/core/label";
import { Input } from "@/components/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/core/Dialog";
import { Exercise } from "@/lib/types/workout";
import { Switch } from "@/components/core/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/core/select";
import { useExerciseSelector } from '../controller/useExerciseSelector';

const LONG_PRESS_DURATION = 500;

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

const ExerciseSelector = () => {
  const [open, setOpen] = useState(false);
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
  } = useExerciseSelector(open);

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
    <div className="flex justify-end">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="default"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus size={16} className="mr-2" />
            Add Exercise
          </Button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (isConfirmDeleteDialogOpen) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="dark:text-white">Select Exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {isLoading ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-2">Loading exercises...</p>
              ) : exercises.length > 0 ? (
                exercises.map((exercise) => (
                  <Button
                    key={exercise.id}
                    variant="outline"
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
                    className="w-full justify-start h-auto py-3 px-4 font-normal hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 select-none"
                    style={{ WebkitTouchCallout: 'none' }}
                  >
                    {exercise.name}
                  </Button>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-2">No matching exercises found</p>
              )}
            </div>

            {isAddingNew ? (
              <div className="p-4 border rounded-lg space-y-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="space-y-1">
                  <Label htmlFor="new-exercise" className="dark:text-white">New Exercise Name</Label>
                  <Input
                    id="new-exercise"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    placeholder="Enter exercise name"
                    className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={isPending}
                  />
                </div>

                <div className="flex items-end space-x-4 pt-2">
                  <div className="flex-grow space-y-1">
                    <Label htmlFor="movement-type-select" className="dark:text-white">Type</Label>
                    <Select
                      value={selectedArchetypeId ?? undefined}
                      onValueChange={setSelectedArchetypeId}
                      disabled={isLoadingArchetypes || isPending}
                    >
                      <SelectTrigger id="movement-type-select" className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder={isLoadingArchetypes ? "Loading types..." : "Select type..."} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                        {archetypes.map(archetype => (
                          <SelectItem key={archetype.id} value={archetype.id} className="dark:text-white dark:hover:bg-gray-700">
                            {formatArchetypeName(archetype.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-shrink-0 space-y-1 pb-1">
                    <Label htmlFor="timed-toggle" className="block text-center dark:text-white">
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
                    variant="outline"
                    className="flex-1 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
                    onClick={() => setIsAddingNew(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={handleCreate}
                    disabled={!newExerciseName.trim() || !selectedArchetypeId || isPending}
                  >
                    {isPending ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
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
        <DialogContent className="sm:max-w-xs dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Remove Exercise</DialogTitle>
            <DialogDescription className="dark:text-gray-300 pt-2">
              Remove "{exerciseToDelete?.name}"?
              {exerciseToDelete?.created_by_user_id ? " This will permanently delete your custom exercise." : " This will hide it from your list."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setIsConfirmDeleteDialogOpen(false)}
              disabled={isPending}
              className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={isPending}
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
