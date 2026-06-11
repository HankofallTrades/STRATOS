import { Button } from "@/components/core/button";
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

type WorkoutDraft = Extract<CoachArtifact, { type: "workout_draft" }>;

const WorkoutDraftArtifact = ({ artifact }: { artifact: WorkoutDraft }) => {
  const { applyWorkoutDraft } = usePresenceAgent();

  return (
    <div className="stone-chip rounded-[20px] p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] verdigris-text">
        {artifact.title}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {artifact.rationale}
      </p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/80">
        {artifact.sessionFocus}
      </p>
      <ul className="mt-2.5 space-y-1.5">
        {artifact.exercises.map((exercise, index) => (
          <li
            key={`${exercise.name}-${index}`}
            className="flex justify-between text-sm text-foreground/92"
          >
            <span>{exercise.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {exercise.sets} sets
            </span>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        className="app-primary-action mt-4 h-10 w-full rounded-[16px] text-sm font-semibold"
        onClick={() => applyWorkoutDraft(artifact.apply.startWorkoutPayload)}
      >
        Apply &amp; start
      </Button>
    </div>
  );
};

export default WorkoutDraftArtifact;
