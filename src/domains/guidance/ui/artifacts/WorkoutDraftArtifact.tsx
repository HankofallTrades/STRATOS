import { Button } from "@/components/core/button";
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

type WorkoutDraft = Extract<CoachArtifact, { type: "workout_draft" }>;

const WorkoutDraftArtifact = ({ artifact }: { artifact: WorkoutDraft }) => {
  const { applyWorkoutDraft } = usePresenceAgent();

  return (
    <div className="rounded-xl border border-primary/40 bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        {artifact.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{artifact.rationale}</p>
      <ul className="mt-2 space-y-1">
        {artifact.exercises.map((exercise, index) => (
          <li
            key={`${exercise.name}-${index}`}
            className="flex justify-between text-sm text-foreground"
          >
            <span>{exercise.name}</span>
            <span className="text-muted-foreground">{exercise.sets} sets</span>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        className="mt-3 w-full"
        onClick={() => applyWorkoutDraft(artifact.apply.startWorkoutPayload)}
      >
        Apply &amp; start
      </Button>
    </div>
  );
};

export default WorkoutDraftArtifact;
