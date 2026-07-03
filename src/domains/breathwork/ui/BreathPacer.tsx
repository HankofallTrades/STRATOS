import type { BreathStep, BreathStepKind } from "../data/protocols";

interface BreathPacerProps {
  step: BreathStep | null;
  /** Whether the circle should sit at full size for the current step. */
  expanded: boolean;
  secondsLeft: number;
  retentionSeconds: number;
  paused: boolean;
}

const PHASE_WORDS: Record<BreathStepKind, string> = {
  inhale: "Inhale",
  hold: "Hold",
  exhale: "Exhale",
  retention: "Hold",
  recovery: "Recover",
};

const transitionSeconds = (step: BreathStep | null): number => {
  if (!step) return 0.3;
  if (step.kind === "inhale" || step.kind === "exhale") return step.seconds ?? 0.3;
  if (step.kind === "recovery") return 1;
  return 0.3;
};

const BreathPacer = ({
  step,
  expanded,
  secondsLeft,
  retentionSeconds,
  paused,
}: BreathPacerProps) => {
  const isRetention = step?.kind === "retention";
  const seconds = isRetention ? retentionSeconds : secondsLeft;

  return (
    <div className="relative flex h-64 w-64 items-center justify-center">
      <div
        aria-hidden
        className="absolute inset-0 rounded-full border border-[rgba(var(--stone-accent-rgb),0.35)] bg-[rgba(var(--stone-accent-rgb),0.12)] shadow-[0_0_90px_-18px_rgba(var(--stone-accent-rgb),0.9)] motion-safe:transition-transform motion-safe:ease-in-out motion-reduce:transition-none"
        style={{
          transform: `scale(${expanded ? 1 : 0.55})`,
          transitionDuration: `${transitionSeconds(step)}s`,
        }}
      />
      <div className="relative flex flex-col items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {paused ? "Paused" : step ? PHASE_WORDS[step.kind] : ""}
        </span>
        <span className="text-4xl font-semibold tabular-nums text-foreground">
          {seconds}
        </span>
      </div>
    </div>
  );
};

export default BreathPacer;
