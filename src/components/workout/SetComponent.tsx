import React from 'react';
import { useState, useEffect } from "react";
import { useWorkout } from "@/context/WorkoutContext";
import { ExerciseSet, WeightSuggestion } from "@/types/workout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

interface SetComponentProps {
  workoutExerciseId: string;
  set: ExerciseSet;
  setNumber: number;
  onUpdate: (updatedSet: ExerciseSet) => void;
  onDelete: () => void;
}

const SetComponent: React.FC<SetComponentProps> = ({ workoutExerciseId, set, setNumber, onUpdate, onDelete }) => {
  const { updateSet, completeSet, getWeightSuggestions } = useWorkout();
  
  const [weight, setWeight] = useState<number>(set.weight);
  const [reps, setReps] = useState<number>(set.reps);
  const [suggestions, setSuggestions] = useState<WeightSuggestion[]>([]);
  
  useEffect(() => {
    setSuggestions(getWeightSuggestions(set.exerciseId));
  }, [set.exerciseId, getWeightSuggestions]);
  
  useEffect(() => {
    setWeight(set.weight);
    setReps(set.reps);
  }, [set.weight, set.reps]);
  
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setWeight(value);
    onUpdate({ ...set, weight: value });
  };
  
  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 0;
    setReps(value);
    onUpdate({ ...set, reps: value });
  };
  
  const handleCompletedChange = () => {
    onUpdate({ ...set, completed: !set.completed });
  };
  
  const handleSuggestionClick = (suggestedWeight: number) => {
    setWeight(suggestedWeight);
    onUpdate({ ...set, weight: suggestedWeight });
  };
  
  return (
    <div className={`p-3 rounded-lg border ${set.completed ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-16 flex items-center">
          <span className="text-gray-500 text-sm font-medium">Set {setNumber}</span>
        </div>
        
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`weight-${set.id}`} className="text-xs text-gray-500 mb-1 block">
              Weight (kg)
            </Label>
            <Input
              id={`weight-${set.id}`}
              type="number"
              min="0"
              step="2.5"
              value={weight || ""}
              onChange={handleWeightChange}
              disabled={set.completed}
              className="h-9"
            />
          </div>
          
          <div>
            <Label htmlFor={`reps-${set.id}`} className="text-xs text-gray-500 mb-1 block">
              Reps
            </Label>
            <Input
              id={`reps-${set.id}`}
              type="number"
              min="0"
              step="1"
              value={reps || ""}
              onChange={handleRepsChange}
              disabled={set.completed}
              className="h-9"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-end">
          <Button
            variant={set.completed ? "default" : "outline"}
            className={set.completed ? "bg-green-500 hover:bg-green-600" : ""}
            onClick={handleCompletedChange}
            aria-label={set.completed ? "Mark as not completed" : "Mark as completed"}
          >
            <CheckCircle2 size={18} />
          </Button>
        </div>
      </div>
      
      {!set.completed && suggestions.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.percentage}
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2 hover:bg-gray-50"
                onClick={() => handleSuggestionClick(suggestion.weight)}
              >
                {suggestion.weight} kg ({suggestion.percentage}%)
              </Button>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-end mt-3">
        <button
          onClick={onDelete}
          className="p-2 text-destructive hover:bg-destructive/10 rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default SetComponent;
