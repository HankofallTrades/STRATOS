import { Button } from "@/components/core/button";
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

type ProgramEdit = Extract<CoachArtifact, { type: "program_edit" }>;

const ProgramEditArtifact = ({ artifact }: { artifact: ProgramEdit }) => {
  const { applyProgramEdit } = usePresenceAgent();

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
            <span className="text-muted-foreground">{change.label}</span>
            {change.before || change.after ? (
              <span className="ml-1">
                {change.before ? (
                  <s className="text-muted-foreground/70">{change.before}</s>
                ) : null}
                {change.before && change.after ? " → " : null}
                {change.after}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {artifact.convertsToCoachProtocol ? (
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          Applying takes this program off its fixed template; it becomes
          coach-managed.
        </p>
      ) : null}
      <Button
        type="button"
        className="app-primary-action mt-4 h-10 w-full rounded-[16px] text-sm font-semibold"
        onClick={() => void applyProgramEdit(artifact.apply)}
      >
        Apply changes
      </Button>
    </div>
  );
};

export default ProgramEditArtifact;
