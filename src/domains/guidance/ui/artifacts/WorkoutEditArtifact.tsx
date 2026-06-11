import { Button } from "@/components/core/button";
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

type WorkoutEdit = Extract<CoachArtifact, { type: "workout_edit" }>;

const WorkoutEditArtifact = ({ artifact }: { artifact: WorkoutEdit }) => {
  const { applyWorkoutEdit } = usePresenceAgent();

  return (
    <div className="stone-chip rounded-[20px] p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] verdigris-text">
        {artifact.title}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {artifact.rationale}
      </p>
      <ul className="mt-2.5 space-y-1.5">
        {artifact.changes.map((change, index) => (
          <li
            key={`${change.label}-${index}`}
            className="text-sm text-foreground/92"
          >
            {change.label}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        className="app-primary-action mt-4 h-10 w-full rounded-[16px] text-sm font-semibold"
        onClick={() => void applyWorkoutEdit(artifact.apply)}
      >
        Apply to workout
      </Button>
    </div>
  );
};

export default WorkoutEditArtifact;
