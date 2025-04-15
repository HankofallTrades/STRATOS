import React, { useState, useEffect } from 'react';
import { ExerciseSet, WeightSuggestion } from "@/lib/types/workout";
import { useWorkout } from "@/state/workout/WorkoutContext";
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
}

const SetComponent: React.FC<SetComponentProps> = ({ workoutExerciseId, set, setIndex, exerciseId }) => {
  const { updateSet, deleteSet, completeSet, exercises } = useWorkout();
  const [localWeight, setLocalWeight] = useState(set.weight.toString());
  const [localReps, setLocalReps] = useState(set.reps.toString());
  const [isCompleted, setIsCompleted] = useState(set.completed);
  const [suggestions, setSuggestions] = useState<WeightSuggestion[]>([]);
  
  const calculateInitialSliderValue = (currentWeight: number, currentSuggestions: WeightSuggestion[]): number => {
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
  }
  const [sliderValue, setSliderValue] = useState<number>(() => calculateInitialSliderValue(set.weight, []));

  useEffect(() => {
    const newSuggestions = getWeightSuggestions(exerciseId, exercises);
    setSuggestions(newSuggestions);
    setSliderValue(calculateInitialSliderValue(parseFloat(localWeight) || set.weight, newSuggestions));
  }, [exerciseId, exercises]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const weight = parseFloat(localWeight) || 0;
      const reps = parseInt(localReps) || 0;
      if (weight !== set.weight || reps !== set.reps) {
        updateSet(workoutExerciseId, set.id, weight, reps);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [localWeight, localReps, workoutExerciseId, set.id, set.weight, set.reps, updateSet]);

  useEffect(() => {
    setSliderValue(calculateInitialSliderValue(parseFloat(localWeight) || 0, suggestions));
  }, [localWeight, suggestions]);

  const handleSliderChange = (value: number[]) => {
    const percentage = value[0];
    setSliderValue(percentage);
    const suggestedWeight = suggestions.find(s => s.percentage === percentage)?.weight;
    if (suggestedWeight !== undefined) {
      setLocalWeight(suggestedWeight.toString());
    }
  };

  const handleCompletionChange = (checked: boolean) => {
    const isNowCompleted = !!checked;
    setIsCompleted(isNowCompleted);
    completeSet(workoutExerciseId, set.id, isNowCompleted);
  };

  useEffect(() => {
    setLocalWeight(set.weight.toString());
    setLocalReps(set.reps.toString());
    setIsCompleted(set.completed);
    setSliderValue(calculateInitialSliderValue(set.weight, suggestions));
  }, [set.weight, set.reps, set.completed, suggestions]);

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
            step={suggestions.length > 1 ? (suggestions[1].percentage - suggestions[0].percentage) : (suggestions.length === 1 ? suggestions[0].percentage : 10)}
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            className="w-full"
            disabled={suggestions.length === 0}
            aria-label="Weight Suggestion Slider"
          />
          <span className="text-xs text-muted-foreground text-center block mt-1">
            {suggestions.length > 0 ? 
             `${sliderValue}% (${suggestions.find(s=>s.percentage === sliderValue)?.weight ?? '-'}kg)` : 
             'No 1RM data'
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
        onClick={() => deleteSet(workoutExerciseId, set.id)} 
        className="w-8 h-8 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Delete Set"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default SetComponent;
