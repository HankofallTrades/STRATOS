import { Button } from "@/components/core/button";
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

type WorkoutEdit = Extract<CoachArtifact, { type: "workout_edit" }>;

const WorkoutEditArtifact = ({ artifact }: { artifact: WorkoutEdit }) => {
  const { applyWorkoutEdit } = usePresenceAgent();

  return (
    <div className="rounded-xl border border-primary/40 bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        {artifact.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{artifact.rationale}</p>
      <ul className="mt-2 space-y-1">
        {artifact.changes.map((change, index) => (
          <li key={`${change.label}-${index}`} className="text-sm text-foreground">
            {change.label}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        className="mt-3 w-full"
        onClick={() => void applyWorkoutEdit(artifact.apply)}
      >
        Apply to workout
      </Button>
    </div>
  );
};

export default WorkoutEditArtifact;
