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
    <div className="stone-chip rounded-[20px] p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] verdigris-text">
        {artifact.title}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/80">
        {artifact.goalFocus} · {artifact.durationWeeks} weeks
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {artifact.rationale}
      </p>
      <div className="mt-3 space-y-3">
        {artifact.sessions.map((session) => (
          <div key={session.name}>
            <p className="text-xs font-semibold text-foreground/90">
              {session.name}
            </p>
            <ul className="mt-1 space-y-1">
              {session.exercises.map((exercise, index) => (
                <li
                  key={`${exercise.name}-${index}`}
                  className="flex justify-between text-sm text-foreground/92"
                >
                  <span>{exercise.name}</span>
                  <span className="tabular-nums text-muted-foreground">
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
        className="app-primary-action mt-4 h-10 w-full rounded-[16px] text-sm font-semibold"
        onClick={() => void applyProgramDraft(artifact.apply)}
      >
        Apply program
      </Button>
    </div>
  );
};

export default ProgramDraftArtifact;
