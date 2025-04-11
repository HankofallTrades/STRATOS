
import { useState } from "react";
import { useWorkout } from "@/context/WorkoutContext";
import { Button } from "@/components/ui/button";
import { Plus, Search, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ExerciseSelector = () => {
  const { exercises, addExerciseToWorkout, addExercise } = useWorkout();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
    if (newExerciseName.trim()) {
      addExercise(newExerciseName.trim());
      setNewExerciseName("");
      setIsAddingNew(false);
    }
  };

  const handleSelectExercise = (exerciseId: string) => {
    addExerciseToWorkout(exerciseId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-fitnessBlue hover:bg-fitnessBlue/90 flex items-center gap-2">
          <Plus size={18} />
          <span>Add Exercise</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Exercise</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredExercises.length > 0 ? (
              filteredExercises.map((exercise) => (
                <Button
                  key={exercise.id}
                  variant="outline"
                  onClick={() => handleSelectExercise(exercise.id)}
                  className="w-full justify-start h-auto py-3 px-4 font-normal hover:bg-gray-50"
                >
                  {exercise.name}
                  {exercise.oneRepMax && (
                    <span className="ml-auto text-xs text-gray-500">
                      1RM: {Math.round(exercise.oneRepMax)} kg
                    </span>
                  )}
                </Button>
              ))
            ) : (
              <p className="text-center text-gray-500 py-2">No matching exercises found</p>
            )}
          </div>

          {isAddingNew ? (
            <div className="p-4 border rounded-lg space-y-3">
              <Label htmlFor="new-exercise">New Exercise Name</Label>
              <div className="flex space-x-2">
                <Input
                  id="new-exercise"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="Enter exercise name"
                  className="flex-1"
                />
                <Button 
                  variant="default" 
                  className="bg-fitnessGreen hover:bg-fitnessGreen/90"
                  onClick={handleAddNew}
                  disabled={!newExerciseName.trim()}
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewExerciseName("");
                  }}
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAddingNew(true)}
            >
              <Plus size={16} className="mr-2" />
              Create New Exercise
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseSelector;
