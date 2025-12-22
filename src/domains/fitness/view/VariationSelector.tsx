import React from 'react';
import { Button } from "@/components/core/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/core/popover";
import { Loader2, Plus } from 'lucide-react';
import { Tables } from '@/lib/integrations/supabase/types';

// Assuming ExerciseVariation is defined in your types, or you can define it here
// For example: type ExerciseVariation = { id: string; variation_name: string; exercise_id: string; ...rest };
type ExerciseVariation = Tables<'exercise_variations'>;

interface VariationSelectorProps {
  selectedVariation: string | null;
  onSelectVariation: (variationName: string | null) => void;
  variations: ExerciseVariation[];
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
          variant="outline"
          size="sm"
          className="rounded-full h-7 px-2.5 text-xs w-auto border-border min-w-[90px] justify-center"
          disabled={disabled || isLoading}
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : (selectedVariation ?? defaultVariationText)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1">
        <div className="flex flex-col gap-1">
          {/* Default/Standard Option - only if defaultVariationText is meaningful */}
          {defaultVariationText && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-xs italic"
              onClick={() => {
                onSelectVariation(null); // Represents selecting the default
                setPopoverOpen(false);
              }}
              disabled={selectedVariation === null} // Disabled if already on default
            >
              {defaultVariationText}
            </Button>
          )}
          {/* Database fetched variations */}
          {variations.map((variation) => (
            <Button
              key={variation.id} // Use the unique ID from the database object
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-xs"
              onClick={() => {
                onSelectVariation(variation.variation_name);
                setPopoverOpen(false);
              }}
              disabled={selectedVariation === variation.variation_name}
            >
              {variation.variation_name}
            </Button>
          ))}
          {/* Add New Variation Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 px-2 text-xs text-blue-600 dark:text-blue-400 mt-1 pt-1 border-t border-border"
            onClick={() => {
              onTriggerAddNewVariation();
              setPopoverOpen(false);
            }}
            disabled={isLoading}
          >
            <Plus size={14} className="mr-1" /> Add New
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VariationSelector; 