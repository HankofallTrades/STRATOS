import React, { useState, useEffect, useCallback } from 'react';
import { ExerciseSet, WeightSuggestion, Exercise } from "@/lib/types/workout";
// import { useWorkout } from "@/state/workout/WorkoutContext"; // Remove old context
import { useAppDispatch, useAppSelector } from "@/hooks/redux"; // ADD useAppSelector import
import { selectLastPerformanceForSet } from "@/state/history/historySlice"; // ADD selector import
import { 
  updateSet as updateSetAction, 
  deleteSet as deleteSetAction, 
  completeSet as completeSetAction 
} from "@/state/workout/workoutSlice"; // Import workout actions
import { Input } from "@/components/core/input";
import { Button } from "@/components/core/button";
import { Checkbox } from "@/components/core/checkbox";
import { Trash2 } from "lucide-react";
// import { Slider } from "@/components/core/slider"; // Commented out slider for now
import { getWeightSuggestions } from "@/lib/workout/workoutUtils";
import {
  TableRow,
  TableCell,
} from "@/components/core/table"; // ADD TableRow and TableCell imports
import { cn } from "@/lib/utils/cn"; // Corrected import path again

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

  // ADDED: Hook call to get previous performance for this set
  const previousPerformance = useAppSelector(state => 
    selectLastPerformanceForSet(state, exerciseId, setIndex)
  );

  // Initialize weight/reps as empty string if set is not completed and value is 0
  const [localWeight, setLocalWeight] = useState(() => (set.completed || set.weight !== 0) ? set.weight.toString() : '');
  const [localReps, setLocalReps] = useState(() => (set.completed || set.reps !== 0) ? set.reps.toString() : '');
  const [isCompleted, setIsCompleted] = useState(set.completed);
  // const [suggestions, setSuggestions] = useState<WeightSuggestion[]>([]); // Commented out slider state
  // const [sliderValue, setSliderValue] = useState<number>(() => calculateInitialSliderValue(initialSliderWeight, [])); // Commented out slider state
  
  // useCallback for helper function to memoize it based on dependencies
  // const calculateInitialSliderValue = useCallback((currentWeight: number, currentSuggestions: WeightSuggestion[]): number => {
  //   if (currentSuggestions.length === 0) return 0;
  //   let closestPercentage = currentSuggestions[0].percentage;
  //   let minDiff = Infinity;
  //   currentSuggestions.forEach(s => {
  //     const diff = Math.abs(s.weight - currentWeight);
  //     if (diff < minDiff) {
  //       minDiff = diff;
  //       closestPercentage = s.percentage;
  //     }
  //   });
  //   return closestPercentage;
  // }, []); // Empty array means it only calculates once unless component remounts

  // Calculate initial slider value based on initial localWeight state
  // const initialSliderWeight = (set.completed || set.weight !== 0) ? set.weight : 0;
  // const [sliderValue, setSliderValue] = useState<number>(() => calculateInitialSliderValue(initialSliderWeight, []));

  // Effect to calculate suggestions when 1RM is available
  // useEffect(() => {
  //   if (oneRepMax && oneRepMax > 0) {
  //       const newSuggestions = getWeightSuggestions(oneRepMax);
  //       setSuggestions(newSuggestions);
  //       // DO NOT set slider value here
  //   } else {
  //       setSuggestions([]);
  //       // DO NOT set slider value here
  //   }
  // // Only depends on oneRepMax
  // }, [oneRepMax]); 

  // Effect to update slider position ONLY when suggestions change (to set initial position)
  // useEffect(() => {
  //   // Convert localWeight to number for calculation, default to 0 if empty/invalid
  //   const currentWeight = parseFloat(localWeight) || 0; 
  //   const newSliderPercentage = calculateInitialSliderValue(currentWeight, suggestions);
  //   
  //   // Only update if the calculated percentage is different from the current slider value
  //   if (newSliderPercentage !== sliderValue) {
  //     setSliderValue(newSliderPercentage);
  //   }
  // // Dependencies: Recalculate slider ONLY when suggestions array changes (or component mounts)
  // }, [localWeight, suggestions, calculateInitialSliderValue]);

  // const handleSliderChange = (value: number[]) => {
  //   const percentage = value[0];
  //   setSliderValue(percentage); // Keep state in sync with slider
  // };

  const handleCompletionChange = (checked: boolean | 'indeterminate') => {
    const isNowCompleted = !!checked;
    setIsCompleted(isNowCompleted);

    if (isNowCompleted) {
      const weight = parseFloat(localWeight) || 0;
      const reps = parseInt(localReps) || 0;
      dispatch(updateSetAction({ workoutExerciseId, setId: set.id, weight, reps }));
    }
    
    dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: isNowCompleted })); // Dispatch Redux action
  };

  const handleDelete = () => {
    // deleteSet(workoutExerciseId, set.id); // Old context call
    dispatch(deleteSetAction({ workoutExerciseId, setId: set.id })); // Dispatch Redux action
  };

  // Render as a TableRow
  return (
    <TableRow 
      key={set.id} 
      className={cn(
        "group", // Keep existing group class
        isCompleted && "bg-green-100 dark:bg-green-900/30" // Conditionally add green background
      )}
    >
      {/* Set Index Cell */}
      <TableCell className="font-medium text-center w-[50px]">{setIndex + 1}</TableCell>

      {/* Previous Performance Cell */}
      <TableCell className="text-center text-xs text-muted-foreground w-[100px]">
        {previousPerformance ? `${previousPerformance.weight}kg x ${previousPerformance.reps}` : '-'}
      </TableCell>

      {/* Weight Input Cell */}
      <TableCell className="w-[100px]">
        <Input
          id={`weight-${set.id}`}
          type="number"
          value={localWeight}
          onChange={(e) => setLocalWeight(e.target.value)}
          className="h-9 w-full text-center no-arrows"
          placeholder="0"
          aria-label="Weight in kilograms"
          disabled={isCompleted} // Optionally disable when completed
        />
      </TableCell>

      {/* Reps Input Cell */}
      <TableCell className="w-[100px]">
        <Input
          id={`reps-${set.id}`}
          type="number"
          value={localReps}
          onChange={(e) => setLocalReps(e.target.value)}
          className="h-9 w-full text-center no-arrows"
          placeholder="0"
          aria-label="Repetitions"
          disabled={isCompleted} // Optionally disable when completed
        />
      </TableCell>

      {/* Actions Cell (Checkbox + Delete Button) */}
      <TableCell className="text-right w-[100px]">
         <div className="flex items-center justify-end space-x-2">
             <Checkbox
                  id={`completed-${set.id}`}
                  checked={isCompleted}
                  onCheckedChange={handleCompletionChange}
                  className="w-5 h-5" // Slightly smaller checkbox
                  aria-label="Mark set as completed"
              />
              <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                   // Make delete always visible or visible on row hover
                  className="w-7 h-7 text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete Set"
              >
                  <Trash2 className="w-4 h-4" />
              </Button>
         </div>
      </TableCell>

      {/* Commented out the original structure and slider */}
      {/*
      <div className="border rounded bg-card text-card-foreground p-3 mb-2 space-y-3 group relative min-h-[120px] sm:min-h-[90px]">
          // ... original complex layout ...
      </div>
      */}
      {/* Slider section commented out
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
                  // Display weight corresponding to the current slider percentage
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
      */}
    </TableRow>
  );
};

export default SetComponent;
