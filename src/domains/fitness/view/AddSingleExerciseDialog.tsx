import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/core/Dialog";
import { Button } from "@/components/core/button";
import { Loader2, Check, X as XIcon } from 'lucide-react';
import { Input } from "@/components/core/input";
import { Label } from "@/components/core/label";
import EquipmentSelector from './EquipmentSelector';
import VariationSelector from './VariationSelector';
import SwipeableIncrementer from '@/components/core/Controls/SwipeableIncrementer';
import { useSingleExerciseLog } from '../controller/useSingleExerciseLog';
import type { ExerciseSetRow } from '../model/fitnessRepository';

// --- Constants ---
const DEFAULT_VARIATION = 'Standard';

interface AddSingleExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLogData?: ExerciseSetRow | null;
}

const AddSingleExerciseDialog: React.FC<AddSingleExerciseDialogProps> = ({ open, onOpenChange, defaultLogData }) => {
  const {
    form,
    exercises,
    variations,
    equipmentTypes,
    selectedExercise,
    isLoading,
    isSubmitting,
    updateField,
    adjustValue,
    submitLog,
    createVariation,
    createEquipment,
  } = useSingleExerciseLog(open, defaultLogData);

  const [equipmentPopoverOpen, setEquipmentPopoverOpen] = useState(false);
  const [variationPopoverOpen, setVariationPopoverOpen] = useState(false);
  const [isAddingVariation, setIsAddingVariation] = useState(false);
  const [newVariationName, setNewVariationName] = useState("");

  const handleSave = async () => {
    const success = await submitLog();
    if (success) {
      onOpenChange(false);
    }
  };

  const handleTriggerAddNewVariation = () => {
    setIsAddingVariation(true);
    setVariationPopoverOpen(false);
  };

  const handleSaveNewVariation = () => {
    const trimmedName = newVariationName.trim();
    if (trimmedName) {
      createVariation(trimmedName);
      setIsAddingVariation(false);
      setNewVariationName("");
    }
  };

  const handleCancelAddNewVariation = () => {
    setIsAddingVariation(false);
    setNewVariationName("");
  };

  const handleEquipmentSelected = (equipmentName: string | null) => {
    updateField('equipmentType', equipmentName);
    if (equipmentName && !equipmentTypes.some(et => et.name.toLowerCase() === equipmentName.toLowerCase())) {
      createEquipment(equipmentName);
    }
  };

  const isPending = isSubmitting || isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Single Exercise</DialogTitle>
          <DialogDescription>
            Quickly log an exercise result outside a full session.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:py-4">
          {/* Exercise Selector */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-grow">
              <label htmlFor="exercise-select" className="sr-only">Exercise</label>
              {isLoading ? (
                <div className="h-9 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <select
                  id="exercise-select"
                  value={form.exerciseId}
                  onChange={(e) => updateField('exerciseId', e.target.value)}
                  className="block h-10 w-full min-w-[150px] rounded-md border border-input bg-background p-2 text-base shadow-sm focus:border-ring focus:outline-none focus:ring-ring sm:text-sm"
                  disabled={isPending}
                >
                  <option value="" disabled>Select Exercise...</option>
                  {exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <EquipmentSelector
                selectedEquipment={form.equipmentType}
                onSelectEquipment={handleEquipmentSelected}
                equipmentTypes={equipmentTypes.map(et => et.name)}
                disabled={isPending}
                popoverOpen={equipmentPopoverOpen}
                setPopoverOpen={setEquipmentPopoverOpen}
              />
              {isAddingVariation ? (
                <div className="flex min-w-0 flex-1 items-center gap-1 sm:h-8 sm:flex-none">
                  <Input
                    type="text"
                    placeholder="New Variation Name"
                    value={newVariationName}
                    onChange={(e) => setNewVariationName(e.target.value)}
                    className="h-10 min-w-0 flex-1 text-sm sm:h-full sm:w-[150px] sm:flex-none sm:text-xs"
                    disabled={isPending}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNewVariation(); if (e.key === 'Escape') handleCancelAddNewVariation(); }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-full w-8 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 flex-shrink-0"
                    onClick={handleSaveNewVariation}
                    disabled={!newVariationName.trim() || isPending}
                    aria-label="Save new variation"
                  >
                    <Check size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-full w-8 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 flex-shrink-0"
                    onClick={handleCancelAddNewVariation}
                    disabled={isPending}
                    aria-label="Cancel adding variation"
                  >
                    <XIcon size={16} />
                  </Button>
                </div>
              ) : (
                <VariationSelector
                  selectedVariation={form.variation}
                  onSelectVariation={(v) => updateField('variation', v)}
                  variations={variations}
                  onTriggerAddNewVariation={handleTriggerAddNewVariation}
                  defaultVariationText={DEFAULT_VARIATION}
                  isLoading={isLoading}
                  disabled={isPending || !form.exerciseId}
                  popoverOpen={variationPopoverOpen}
                  setPopoverOpen={setVariationPopoverOpen}
                />
              )}
            </div>
          </div>

          {/* --- Weight & Reps/Time Inputs --- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Weight Input Group */}
            <div>
              <Label htmlFor="weight-input" className="block text-sm font-medium mb-1">Weight (kg/lbs)</Label>
              <div className="flex flex-col gap-2">
                <Input
                  type="number"
                  id="weight-input"
                  value={form.weight}
                  onChange={(e) => updateField('weight', e.target.value)}
                  step="0.5"
                  min="0"
                  inputMode="decimal"
                  className="block w-full p-2 border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm text-center"
                  placeholder="0"
                  disabled={isPending}
                />
                <div className="flex items-center justify-center">
                  <SwipeableIncrementer
                    onAdjust={(adj) => adjustValue('weight', adj)}
                    smallStepPositive={0.5}
                    smallStepNegative={-0.5}
                    swipeUpStep={5}
                    swipeDownStep={-5}
                    swipeRightStep={2.5}
                    swipeLeftStep={-2.5}
                    disabled={isPending}
                    label="Adjust weight"
                    buttonSize="icon"
                    iconSize={14}
                    wrapperClassName="gap-1"
                  />
                </div>
              </div>
            </div>

            {/* Conditional Reps or Time Input Group */}
            {selectedExercise?.is_static ? (
              <div>
                <Label htmlFor="time-input" className="block text-sm font-medium mb-1">Time (seconds)</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="number"
                    id="time-input"
                    value={form.timeSeconds}
                    onChange={(e) => updateField('timeSeconds', e.target.value)}
                    min="1"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="block w-full p-2 border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm text-center"
                    placeholder="Enter time"
                    disabled={isPending || !form.exerciseId}
                  />
                  <div className="flex items-center justify-center">
                    <SwipeableIncrementer
                      onAdjust={(adj) => adjustValue('timeSeconds', adj)}
                      smallStepPositive={1}
                      smallStepNegative={-1}
                      swipeUpStep={5}
                      swipeDownStep={-5}
                      swipeRightStep={2}
                      swipeLeftStep={-2}
                      disabled={isPending || !form.exerciseId}
                      label="Adjust time"
                      buttonSize="icon"
                      iconSize={14}
                      wrapperClassName="gap-1"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="reps-input" className="block text-sm font-medium mb-1">Reps</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="number"
                    id="reps-input"
                    value={form.reps}
                    onChange={(e) => updateField('reps', e.target.value)}
                    min="1"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="block w-full p-2 border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm text-center"
                    placeholder="Enter reps"
                    disabled={isPending || !form.exerciseId}
                  />
                  <div className="flex items-center justify-center">
                    <SwipeableIncrementer
                      onAdjust={(adj) => adjustValue('reps', adj)}
                      smallStepPositive={1}
                      smallStepNegative={-1}
                      swipeUpStep={10}
                      swipeDownStep={-10}
                      swipeRightStep={5}
                      swipeLeftStep={-5}
                      disabled={isPending || !form.exerciseId}
                      label="Adjust reps"
                      buttonSize="icon"
                      iconSize={14}
                      wrapperClassName="gap-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSingleExerciseDialog;
