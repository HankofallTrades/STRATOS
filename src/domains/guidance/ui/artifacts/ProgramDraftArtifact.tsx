import { Button } from "@/components/core/button";
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

type ProgramDraft = Extract<CoachArtifact, { type: "program_draft" }>;

const formatTargets = (targetSets: number | null, targetReps: string | null) => {
  if (targetSets === null && targetReps === null) return null;
  return `${targetSets ?? "?"}×${targetReps ?? "?"}`;
};

const ProgramDraftArtifact = ({ artifact }: { artifact: ProgramDraft }) => {
  const { applyProgramDraft } = usePresenceAgent();

  return (
    <div className="rounded-xl border border-primary/40 bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        {artifact.title}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {artifact.goalFocus} · {artifact.durationWeeks} weeks
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{artifact.rationale}</p>
      <div className="mt-2 space-y-2">
        {artifact.sessions.map((session) => (
          <div key={session.name}>
            <p className="text-xs font-medium text-foreground">{session.name}</p>
            <ul className="mt-1 space-y-0.5">
              {session.exercises.map((exercise, index) => (
                <li
                  key={`${exercise.name}-${index}`}
                  className="flex justify-between text-sm text-foreground"
                >
                  <span>{exercise.name}</span>
                  <span className="text-muted-foreground">
                    {formatTargets(exercise.targetSets, exercise.targetReps)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Button
        type="button"
        className="mt-3 w-full"
        onClick={() => void applyProgramDraft(artifact.apply)}
      >
        Apply program
      </Button>
    </div>
  );
};

export default ProgramDraftArtifact;
