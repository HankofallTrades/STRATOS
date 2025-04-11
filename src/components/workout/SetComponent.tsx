import React from 'react';
import { useState, useEffect, useMemo } from "react";
import { useWorkout } from "@/context/WorkoutContext";
import { ExerciseSet, WeightSuggestion } from "@/types/workout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface SetComponentProps {
  workoutExerciseId: string;
  set: ExerciseSet;
  setNumber: number;
  onUpdate: (updatedSet: ExerciseSet) => void;
  onDelete: () => void;
  currentEquipmentType: 'DB' | 'BB' | 'KB' | 'Cable' | 'Free' | undefined;
  currentVariation: string | undefined;
}

const SetComponent: React.FC<SetComponentProps> = ({
  workoutExerciseId,
  set,
  setNumber,
  onUpdate,
  onDelete,
  currentEquipmentType,
  currentVariation,
}) => {
  const { 
    updateSet, 
    completeSet, 
    getWeightSuggestions,
    getLastSetPerformance
  } = useWorkout();
  
  const [weight, setWeight] = useState<number>(set.weight);
  const [reps, setReps] = useState<number>(set.reps);
  const [suggestions, setSuggestions] = useState<WeightSuggestion[]>([]);
  
  const lastPerformance = useMemo(() => {
    return getLastSetPerformance(
      set.exerciseId,
      setNumber,
      currentEquipmentType,
      currentVariation
    );
  }, [set.exerciseId, setNumber, currentEquipmentType, currentVariation, getLastSetPerformance]);
  
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
  
  const handleSliderChange = (value: number[]) => {
    const newWeight = value[0];
    setWeight(newWeight);
    onUpdate({ ...set, weight: newWeight });
  };
  
  const handleSuggestionMarkerClick = (suggestedWeight: number) => {
    setWeight(suggestedWeight);
    onUpdate({ ...set, weight: suggestedWeight });
  };

  const sliderMin = useMemo(() => {
    if (suggestions.length > 0) {
      return suggestions[0].weight;
    }
    return 0;
  }, [suggestions]);

  const sliderMax = useMemo(() => {
    if (suggestions.length > 0) {
      return suggestions[suggestions.length - 1].weight;
    }
    const exercise = useWorkout().getExercise(set.exerciseId);
    return Math.max(50, Math.round((exercise?.oneRepMax || 50) / 0.5) * 0.5);
  }, [suggestions, set.exerciseId, useWorkout]);

  const suggestionMarkers = useMemo(() => {
    if (sliderMax <= sliderMin) return [];
    return suggestions.map(suggestion => ({
      weight: suggestion.weight,
      percentage: suggestion.percentage,
      position: ((suggestion.weight - sliderMin) / (sliderMax - sliderMin)) * 100
    }));
  }, [suggestions, sliderMin, sliderMax]);
  
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
              {lastPerformance && (
                <span className="ml-2 text-xs text-gray-400 font-normal">(Last: {lastPerformance.weight}kg)</span>
              )}
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
              {lastPerformance && (
                <span className="ml-2 text-xs text-gray-400 font-normal">(Last: {lastPerformance.reps})</span>
              )}
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
      
      {!set.completed && (
        <div className="mt-4 space-y-3">
          <div className="px-8">
            <Slider
              value={[weight]}
              onValueChange={handleSliderChange}
              min={sliderMin}
              max={sliderMax}
              step={0.5}
              disabled={set.completed}
              aria-label="Weight Slider"
              className="w-full"
            />
          </div>
          {suggestionMarkers.length > 0 && sliderMax > sliderMin && (
            <div className="relative h-4 px-8">
              <div className="relative w-full h-full">
                <div className="absolute inset-x-[10px] h-full">
                  {suggestionMarkers.map((marker) => (
                    <div 
                      key={marker.percentage}
                      className="absolute text-center group cursor-pointer whitespace-nowrap"
                      style={{ 
                        left: `${marker.position}%`, 
                        transform: 'translateX(-50%)'
                      }}
                      onClick={() => handleSuggestionMarkerClick(marker.weight)}
                    >
                      <div className="w-px h-1.5 bg-gray-300 group-hover:bg-primary mx-auto"></div>
                      <span className="text-[10px] text-gray-500 group-hover:font-semibold">
                        {marker.weight}kg ({marker.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
