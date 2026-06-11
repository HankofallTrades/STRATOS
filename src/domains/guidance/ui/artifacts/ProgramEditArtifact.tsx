import { Button } from "@/components/core/button";
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

type ProgramEdit = Extract<CoachArtifact, { type: "program_edit" }>;

const ProgramEditArtifact = ({ artifact }: { artifact: ProgramEdit }) => {
  const { applyProgramEdit } = usePresenceAgent();

  return (
    <div className="rounded-xl border border-primary/40 bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        {artifact.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{artifact.rationale}</p>
      <ul className="mt-2 space-y-1">
        {artifact.changes.map((change, index) => (
          <li key={`${change.label}-${index}`} className="text-sm text-foreground">
            <span className="text-muted-foreground">{change.label}</span>
            {change.before || change.after ? (
              <span className="ml-1">
                {change.before ? <s>{change.before}</s> : null}
                {change.before && change.after ? " → " : null}
                {change.after}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {artifact.convertsToCoachProtocol ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Applying takes this program off its fixed template — it becomes
          coach-managed.
        </p>
      ) : null}
      <Button
        type="button"
        className="mt-3 w-full"
        onClick={() => void applyProgramEdit(artifact.apply)}
      >
        Apply changes
      </Button>
    </div>
  );
};

export default ProgramEditArtifact;
