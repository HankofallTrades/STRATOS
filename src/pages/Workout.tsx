import WorkoutComponent from "@/components/features/Workout/WorkoutComponent";

const Workout = () => {
  // This page now assumes a workout is active when loaded.
  // It directly renders the main WorkoutComponent.
  // Consider adding a check or redirect if no workout is active, if needed.
  return (
    <div className="container mx-auto p-4">
      {/* Optionally add a specific header or layout for the workout page */}
      <WorkoutComponent />
    </div>
  );
};

export default Workout;
