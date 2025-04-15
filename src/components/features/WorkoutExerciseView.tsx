import React from 'react';
import { Exercise, ExerciseSet } from '@/lib/types/workout';
import { EquipmentType } from '@/lib/types/enums'; // Correct import path
import { Button } from '@/components/core/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/core/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/core/card';
import { Plus } from 'lucide-react';
import SetComponent from './SetComponent'; // Assuming SetComponent exists in the same directory

interface WorkoutExerciseViewProps {
  workoutExercise: { id: string; exerciseId: string; exercise: Exercise; sets: ExerciseSet[]; equipmentType?: EquipmentType }; // Added equipmentType
  variations: string[];
  equipmentTypes: Readonly<EquipmentType[]>; // Use readonly array
  lastPerformance: { weight: number; reps: number } | null;
  oneRepMax: number | null; // Add oneRepMax prop
  onAddSet: () => void;
  onEquipmentChange: (value: EquipmentType) => void; // Use specific type
  onVariationChange: (value: string) => void;
  // onSetUpdate: (set: ExerciseSet) => void; // Removed - SetComponent handles updates internally
  // onSetDelete: (setId: string) => void; // Removed - SetComponent handles deletes internally
}

export const WorkoutExerciseView = ({
  workoutExercise,
  variations,
  equipmentTypes,
  lastPerformance,
  oneRepMax, // Destructure oneRepMax
  onAddSet,
  onEquipmentChange,
  onVariationChange,
  // onSetUpdate, // Removed
  // onSetDelete, // Removed
}: WorkoutExerciseViewProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap"> {/* Added flex-wrap */}
          {/* Use default_equipment_type and handle potential null/undefined */}
          <Select value={workoutExercise.equipmentType ?? undefined} onValueChange={(value) => onEquipmentChange(value as EquipmentType)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Equipment" />
            </SelectTrigger>
            <SelectContent>
              {equipmentTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>{workoutExercise.exercise.name}</span>
          {/* Variation Select: Use variation from last set as default */}
          {variations && variations.length > 0 && (
             <Select value={workoutExercise.sets.at(-1)?.variation ?? undefined} onValueChange={onVariationChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Variation" />
              </SelectTrigger>
              <SelectContent>
                {variations.map((variation) => (
                  <SelectItem key={variation} value={variation}>
                    {variation}
                  </SelectItem>
                ))}
                {/* TODO: Re-enable "Add New" variation if needed */}
                {/* <SelectItem value="add_new">+ Add New</SelectItem> */}
              </SelectContent>
            </Select>
          )}
        </div>
        {lastPerformance && (
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            Last: {lastPerformance.weight} kg × {lastPerformance.reps} reps
          </span>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {workoutExercise.sets.map((set, index) => (
          <SetComponent
            key={set.id}
            workoutExerciseId={workoutExercise.id}
            set={set}
            setIndex={index} // Pass the index as setIndex
            exerciseId={workoutExercise.exerciseId}
            oneRepMax={oneRepMax} // Pass down oneRepMax
            // onUpdate={onSetUpdate} // Removed
            // onDelete={() => onSetDelete(set.id)} // Removed
          />
        ))}
        <Button variant="outline" className="w-full border-dashed dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700" onClick={onAddSet}>
          <Plus size={16} className="mr-2" />
          Add Set
        </Button>
      </div>
    </CardContent>
  </Card>
); 