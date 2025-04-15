import React, { useState, useEffect, useCallback } from 'react';
import { ExerciseSet, WeightSuggestion, Exercise } from "@/lib/types/workout";
// import { useWorkout } from "@/state/workout/WorkoutContext"; // Remove old context
import { useAppDispatch } from "@/hooks/redux"; // Keep dispatch
import { 
  updateSet as updateSetAction, 
  deleteSet as deleteSetAction, 
  completeSet as completeSetAction 
} from "@/state/workout/workoutSlice"; // Import workout actions
import { Input } from "@/components/core/input";
import { Button } from "@/components/core/button";
import { Checkbox } from "@/components/core/checkbox";
import { Label } from "@/components/core/label";
import { Trash2 } from "lucide-react";
import { Slider } from "@/components/core/slider";
import { getWeightSuggestions } from "@/lib/workout/workoutUtils";

interface SetComponentProps {
  workoutExerciseId: string;
  set: ExerciseSet;
  setIndex: number;
  exerciseId: string;
  oneRepMax?: number | null; // Add optional prop for 1RM
}

const SetComponent: React.FC<SetComponentProps> = ({ workoutExerciseId, set, setIndex, exerciseId, oneRepMax }) => {
  // const { updateSet, deleteSet, completeSet, exercises } = useWorkout(); // Remove old context usage
  const dispatch = useAppDispatch();

  // Initialize weight/reps as empty string if set is not completed and value is 0
  const [localWeight, setLocalWeight] = useState(() => (set.completed || set.weight !== 0) ? set.weight.toString() : '');
  const [localReps, setLocalReps] = useState(() => (set.completed || set.reps !== 0) ? set.reps.toString() : '');
  const [isCompleted, setIsCompleted] = useState(set.completed);
  const [suggestions, setSuggestions] = useState<WeightSuggestion[]>([]);
  
  // useCallback for helper function to memoize it based on dependencies
  const calculateInitialSliderValue = useCallback((currentWeight: number, currentSuggestions: WeightSuggestion[]): number => {
    if (currentSuggestions.length === 0) return 0;
    let closestPercentage = currentSuggestions[0].percentage;
    let minDiff = Infinity;
    currentSuggestions.forEach(s => {
      const diff = Math.abs(s.weight - currentWeight);
      if (diff < minDiff) {
        minDiff = diff;
        closestPercentage = s.percentage;
      }
    });
    return closestPercentage;
  }, []); // Empty array means it only calculates once unless component remounts

  // Calculate initial slider value based on initial localWeight state
  const initialSliderWeight = (set.completed || set.weight !== 0) ? set.weight : 0;
  const [sliderValue, setSliderValue] = useState<number>(() => calculateInitialSliderValue(initialSliderWeight, []));

  // Effect to calculate suggestions when 1RM is available
  useEffect(() => {
    if (oneRepMax && oneRepMax > 0) {
        const newSuggestions = getWeightSuggestions(oneRepMax);
        setSuggestions(newSuggestions);
        // DO NOT set slider value here
    } else {
        setSuggestions([]);
        // DO NOT set slider value here
    }
  // Only depends on oneRepMax
  }, [oneRepMax]); 

  // Effect to update slider position ONLY when suggestions change (to set initial position)
  useEffect(() => {
    // Convert localWeight to number for calculation, default to 0 if empty/invalid
    const currentWeight = parseFloat(localWeight) || 0; 
    const newSliderPercentage = calculateInitialSliderValue(currentWeight, suggestions);
    
    // Only update if the calculated percentage is different from the current slider value
    if (newSliderPercentage !== sliderValue) {
      setSliderValue(newSliderPercentage);
    }
  // Dependencies: Recalculate slider ONLY when suggestions array changes (or component mounts)
  }, [localWeight, suggestions, calculateInitialSliderValue]);

  const handleSliderChange = (value: number[]) => {
    const percentage = value[0];
    setSliderValue(percentage); // Keep state in sync with slider
  };

  const handleCompletionChange = (checked: boolean | 'indeterminate') => {
    const isNowCompleted = !!checked; // Ensure boolean
    setIsCompleted(isNowCompleted);

    // If marking as completed, first update the weight and reps
    if (isNowCompleted) {
      const weight = parseFloat(localWeight) || 0;
      const reps = parseInt(localReps) || 0;
      // Only dispatch update if values differ from original set state or haven't been saved yet
      // (Or simply always dispatching might be fine, Redux handles redundancy if needed)
      dispatch(updateSetAction({ workoutExerciseId, setId: set.id, weight, reps }));
    }
    
    // Then, update the completion status
    dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: isNowCompleted })); // Dispatch Redux action
  };

  const handleDelete = () => {
    // deleteSet(workoutExerciseId, set.id); // Old context call
    dispatch(deleteSetAction({ workoutExerciseId, setId: set.id })); // Dispatch Redux action
  };

  return (
    <div className="border rounded bg-card text-card-foreground p-3 mb-2 space-y-3 group relative min-h-[120px] sm:min-h-[90px]"> {/* Added min-height for consistency */}
      {/* Top Row: Using CSS Grid for Layout - Simplified Columns */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 sm:gap-x-3 w-full"> {/* Simplified grid cols */} 
          {/* Set Index (Grid Col 1 - Left) */}
          <span className="font-medium w-6 text-center text-muted-foreground pt-7 sm:pt-0 flex-shrink-0">{setIndex + 1}</span>

          {/* Wrapper for Centered Input Elements (Grid Col 2 - Middle, takes remaining space) */}
          {/* Use place-self-center on the wrapper */} 
          <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 flex-shrink-0 place-self-center"> 
              {/* Weight Input Group */}
              <div className="flex flex-col items-start flex-shrink-0 w-20">
                  <Label htmlFor={`weight-${set.id}`} className="text-xs text-muted-foreground mb-1 truncate">Weight (kg)</Label>
                  <Input 
                    id={`weight-${set.id}`} 
                    type="number" 
                    value={localWeight}
                    onChange={(e) => setLocalWeight(e.target.value)}
                    className="h-9 w-full text-center no-arrows" // Use full width of container
                    placeholder="0"
                    aria-label="Weight in kilograms"
                  />
              </div>

              <span className="text-muted-foreground self-center pt-6 sm:pt-0 sm:self-end sm:pb-2">x</span> 

              {/* Reps Input Group */}
              <div className="flex flex-col items-start flex-shrink-0 w-20">
                  <Label htmlFor={`reps-${set.id}`} className="text-xs text-muted-foreground mb-1">Reps</Label>
                  <Input 
                    id={`reps-${set.id}`} 
                    type="number" 
                    value={localReps}
                    onChange={(e) => setLocalReps(e.target.value)}
                    className="h-9 w-full text-center no-arrows" // Use full width of container
                    placeholder="0"
                    aria-label="Repetitions"
                  />
              </div>
          </div>
          {/* End Wrapper for Centered Input Elements */}

          {/* Removed 3rd Grid Column */} 

      </div>
      {/* End Top Row */}

      {/* Action Buttons Container (Absolutely Positioned - Aligned Horizontally) */}
      {/* Stays the same, positioned relative to the main card */}
      <div className="absolute top-3 right-3 flex items-center space-x-2"> 
          {/* Completion Checkbox Group (Checkbox + Label) */}
          <div className="flex flex-col items-center text-center flex-shrink-0">
              <Checkbox 
                  id={`completed-${set.id}`}
                  checked={isCompleted}
                  onCheckedChange={handleCompletionChange}
                  className="w-6 h-6" 
                  aria-label="Mark set as completed"
              />
              <Label htmlFor={`completed-${set.id}`} className="text-xs text-muted-foreground mt-1 cursor-pointer">Done</Label>
          </div>
          {/* Delete Button (Now part of the absolute container, always visible on hover of card) */}
          <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDelete}
              className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" 
              aria-label="Delete Set"
          >
              <Trash2 className="w-4 h-4" />
          </Button>
      </div>
      {/* End Action Buttons Container */}

      {/* Bottom Row/Section: Slider - Keep centering */}
      {oneRepMax && oneRepMax > 0 ? (
          suggestions.length > 0 ? (
            <div className="pt-2 space-y-1 max-w-xs mx-auto"> 
                <Label className="text-xs text-muted-foreground">Adjust Weight (% 1RM)</Label>
                <Slider
                    min={suggestions[0]?.percentage ?? 0}
                    max={suggestions[suggestions.length - 1]?.percentage ?? 100}
                    // Calculate step dynamically based on suggestions if possible
                    step={suggestions.length > 1 ? (suggestions[1].percentage - suggestions[0].percentage) : (suggestions.length === 1 ? suggestions[0].percentage : 5)} // Default step 5 if only one suggestion or weird data
                    value={[sliderValue]}
                    onValueChange={handleSliderChange}
                    className="w-full cursor-pointer"
                    aria-label="Weight Suggestion Slider"
                />
                <span className="text-xs text-muted-foreground text-center block">
                  {/* Display weight corresponding to the current slider percentage */}
                  {`${sliderValue}% (${suggestions.find(s=>s.percentage === sliderValue)?.weight?.toFixed(1) ?? '-'}kg)`}
                </span>
            </div>
          ) : (
             <div className="pt-2 text-center"> 
                <span className="text-xs text-muted-foreground italic">Calculating suggestions...</span>
             </div>
          )
      ) : (
           <div className="pt-1 text-center max-w-xs mx-auto"> 
              <span className="text-xs text-muted-foreground italic">Enter Exercise 1RM for suggestions</span>
           </div>
      )}
    </div>
  );
};

export default SetComponent;
