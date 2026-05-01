import React from 'react';
import { Button } from "@/components/core/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/core/popover";
import { ChevronDown, Loader2, Plus } from 'lucide-react';
import type { ExerciseVariationRow } from '../data/fitnessRepository';
import {
  workoutMenuOptionClassName,
  workoutPopoverClassName,
} from './workoutSelectionStyles';

interface VariationSelectorProps {
  selectedVariation: string | null;
  onSelectVariation: (variationName: string | null) => void;
  variations: ExerciseVariationRow[];
  onTriggerAddNewVariation: () => void;
  defaultVariationText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  popoverOpen: boolean;
  setPopoverOpen: (open: boolean) => void;
}

const VariationSelector: React.FC<VariationSelectorProps> = ({
  selectedVariation,
  onSelectVariation,
  variations,
  onTriggerAddNewVariation,
  defaultVariationText = 'Standard',
  isLoading,
  disabled,
  popoverOpen,
  setPopoverOpen,
}) => {
  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="stone-chip h-10 min-w-[124px] justify-between rounded-[14px] px-3 text-xs text-foreground/88 hover:bg-white/[0.05] hover:text-foreground"
          disabled={disabled || isLoading}
        >
          <span className="truncate">{isLoading ? "Loading..." : (selectedVariation ?? defaultVariationText)}</span>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={workoutPopoverClassName}>
        <div className="flex flex-col gap-1">
          {defaultVariationText && (
            <Button
              variant="ghost"
              size="sm"
              className={workoutMenuOptionClassName}
              onClick={() => {
                onSelectVariation(null);
                setPopoverOpen(false);
              }}
              disabled={selectedVariation === null}
            >
              {defaultVariationText}
            </Button>
          )}
          {variations.map((variation) => (
            <Button
              key={variation.id}
              variant="ghost"
              size="sm"
              className={workoutMenuOptionClassName}
              onClick={() => {
                onSelectVariation(variation.variation_name);
                setPopoverOpen(false);
              }}
              disabled={selectedVariation === variation.variation_name}
            >
              {variation.variation_name}
            </Button>
          ))}
          <div className="mt-2 border-t border-white/8 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className={`${workoutMenuOptionClassName} text-muted-foreground hover:text-foreground`}
              onClick={() => {
                onTriggerAddNewVariation();
                setPopoverOpen(false);
              }}
              disabled={isLoading}
            >
              <Plus size={14} className="mr-1" /> Add New
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VariationSelector; 
