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

  const [localWeight, setLocalWeight] = useState(set.weight.toString());
  const [localReps, setLocalReps] = useState(set.reps.toString());
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

  const [sliderValue, setSliderValue] = useState<number>(() => calculateInitialSliderValue(set.weight, []));

  // Effect to calculate suggestions when oneRepMax changes
  useEffect(() => {
    // Calculate suggestions only if oneRepMax is available and greater than 0
    if (oneRepMax && oneRepMax > 0) {
        const newSuggestions = getWeightSuggestions(oneRepMax); // Pass 1RM directly
        setSuggestions(newSuggestions);
        setSliderValue(calculateInitialSliderValue(parseFloat(localWeight) || set.weight, newSuggestions));
    } else {
        // If no 1RM, clear suggestions
        setSuggestions([]);
        setSliderValue(0); // Reset slider
    }
  // Update dependency array: use oneRepMax instead of exercises
  }, [oneRepMax, calculateInitialSliderValue, localWeight, set.weight]); 

  // Effect to debounce weight/reps updates
  useEffect(() => {
    const handler = setTimeout(() => {
      const weight = parseFloat(localWeight) || 0;
      const reps = parseInt(localReps) || 0;
      // Only dispatch if the value actually changed from the prop
      if (weight !== set.weight || reps !== set.reps) {
        // updateSet(workoutExerciseId, set.id, weight, reps); // Old context call
        dispatch(updateSetAction({ workoutExerciseId, setId: set.id, weight, reps })); // Dispatch Redux action
      }
    }, 500);

    return () => clearTimeout(handler);
    // Add dispatch to dependency array
  }, [localWeight, localReps, workoutExerciseId, set.id, set.weight, set.reps, dispatch]); 

  // Effect to update slider when local weight changes
  useEffect(() => {
    setSliderValue(calculateInitialSliderValue(parseFloat(localWeight) || 0, suggestions));
  }, [localWeight, suggestions, calculateInitialSliderValue]);

  const handleSliderChange = (value: number[]) => {
    const percentage = value[0];
    setSliderValue(percentage);
    const suggestedWeight = suggestions.find(s => s.percentage === percentage)?.weight;
    if (suggestedWeight !== undefined) {
      setLocalWeight(suggestedWeight.toString());
      // Optionally trigger the update dispatch immediately or rely on the debounce effect
    }
  };

  const handleCompletionChange = (checked: boolean | 'indeterminate') => {
    const isNowCompleted = !!checked; // Ensure boolean
    setIsCompleted(isNowCompleted);
    // completeSet(workoutExerciseId, set.id, isNowCompleted); // Old context call
    dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: isNowCompleted })); // Dispatch Redux action
  };

  const handleDelete = () => {
    // deleteSet(workoutExerciseId, set.id); // Old context call
    dispatch(deleteSetAction({ workoutExerciseId, setId: set.id })); // Dispatch Redux action
  };

  // Effect to reset local state if the underlying set prop changes from parent
  useEffect(() => {
    setLocalWeight(set.weight.toString());
    setLocalReps(set.reps.toString());
    setIsCompleted(set.completed);
    // Recalculate slider based on potentially new set weight and existing suggestions
    setSliderValue(calculateInitialSliderValue(set.weight, suggestions));
  }, [set.weight, set.reps, set.completed, suggestions, calculateInitialSliderValue]);

  return (
    <div className="flex items-center space-x-2 mb-2 p-2 border rounded bg-card text-card-foreground relative group">
      <span className="font-medium w-6 text-center text-muted-foreground">{setIndex + 1}</span>
      <div className="flex flex-col items-center w-20">
        <Label htmlFor={`weight-${set.id}`} className="sr-only">Weight</Label>
        <Input 
          id={`weight-${set.id}`} 
          type="number" 
          value={localWeight}
          onChange={(e) => setLocalWeight(e.target.value)}
          className="h-8 text-center no-arrows"
          placeholder="kg"
          aria-label="Weight"
        />
         <span className="text-xs text-muted-foreground">kg</span>
      </div>
      <span className="text-muted-foreground">x</span>
      <div className="flex flex-col items-center w-20">
        <Label htmlFor={`reps-${set.id}`} className="sr-only">Reps</Label>
        <Input 
          id={`reps-${set.id}`} 
          type="number" 
          value={localReps}
          onChange={(e) => setLocalReps(e.target.value)}
          className="h-8 text-center no-arrows"
          placeholder="Reps"
          aria-label="Reps"
        />
         <span className="text-xs text-muted-foreground">reps</span>
      </div>
       <div className="flex-1 px-2">
          <Slider
            min={suggestions[0]?.percentage ?? 0}
            max={suggestions[suggestions.length - 1]?.percentage ?? 100}
            // Calculate step dynamically based on suggestions if possible
            step={suggestions.length > 1 ? (suggestions[1].percentage - suggestions[0].percentage) : (suggestions.length === 1 ? suggestions[0].percentage : 10)} 
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            className="w-full"
            disabled={suggestions.length === 0}
            aria-label="Weight Suggestion Slider"
          />
          <span className="text-xs text-muted-foreground text-center block mt-1">
            {suggestions.length > 0 ? 
             // Display weight corresponding to the current slider percentage
             `${sliderValue}% (${suggestions.find(s=>s.percentage === sliderValue)?.weight ?? '-'}kg)` : 
             'No 1RM data' // Or calculate based on current weight?
            }
          </span>
        </div>
      <Checkbox 
        id={`completed-${set.id}`}
        checked={isCompleted}
        onCheckedChange={handleCompletionChange}
        className="w-5 h-5 mr-2"
        aria-label="Mark set as completed"
      />
      <Button 
        variant="ghost" 
        size="icon" 
        // onClick={() => deleteSet(workoutExerciseId, set.id)} 
        onClick={handleDelete} // Use internal handler
        className="w-8 h-8 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Delete Set"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default SetComponent;
