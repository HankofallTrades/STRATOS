import { useEffect, useRef } from "react";

import { Button } from "@/components/core/button";

import type { BreathStep, BreathworkProtocol } from "../data/protocols";
import { useBreathworkSession } from "../hooks/useBreathworkSession";
import BreathPacer from "./BreathPacer";

export interface BreathworkResult {
  elapsedSeconds: number;
  unitsCompleted: number;
  /** True once at least one full cycle/round finished — worth logging. */
  saveOnExit: boolean;
}

const isExpanded = (step: BreathStep | null, steps: BreathStep[], index: number) => {
  if (!step) return false;
  switch (step.kind) {
    case "inhale":
    case "recovery":
      return true;
    case "exhale":
    case "retention":
      return false;
    case "hold":
      return steps[index - 1]?.kind === "inhale";
  }
};

const progressLine = (
  protocol: BreathworkProtocol,
  step: BreathStep | null,
  unitsCompleted: number,
  totalUnits: number
): string => {
  if (!step) return "";
  const unit = Math.min(step.unit + 1, totalUnits);
  if (protocol.type === "paced") return `Cycle ${unit} of ${totalUnits}`;
  if (step.kind === "retention") return `Round ${unit} · Hold`;
  if (step.kind === "recovery") return `Round ${unit} · Recover`;
  return `Round ${unit} · Breath ${step.breath} of ${protocol.breathsPerRound}`;
};

/**
 * Owns a running breathwork session: auto-starts on mount, renders the pacer and
 * pause/end controls, and calls `onDone` exactly once when the session finishes.
 * It renders nothing after that — the parent decides what "done" means (log it,
 * show a summary, close an overlay). Shared by the standalone dialog and the
 * in-session exercise card.
 */
const BreathworkRunner = ({
  protocol,
  minutes,
  onDone,
}: {
  protocol: BreathworkProtocol;
  minutes?: number;
  onDone: (result: BreathworkResult) => void;
}) => {
  const session = useBreathworkSession(protocol, minutes);
  const startRef = useRef(session.start);
  startRef.current = session.start;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const firedRef = useRef(false);

  useEffect(() => {
    startRef.current();
  }, []);

  const { status, saveOnExit, elapsedSeconds, unitsCompleted } = session;
  useEffect(() => {
    if (status !== "done" || firedRef.current) return;
    firedRef.current = true;
    onDoneRef.current({ elapsedSeconds, unitsCompleted, saveOnExit });
  }, [status, saveOnExit, elapsedSeconds, unitsCompleted]);

  if (status === "done") return null;

  const paused = status === "paused";
  const inRetention = status === "retention";

  return (
    <div
      className="flex h-full flex-col"
      onClick={inRetention ? session.tapRetention : undefined}
    >
      <div className="px-6 pt-6">
        <span className="app-kicker">{protocol.name}</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <BreathPacer
          step={session.step}
          expanded={isExpanded(session.step, session.steps, session.stepIndex)}
          secondsLeft={session.secondsLeft}
          retentionSeconds={session.retentionSeconds}
          paused={paused}
        />
        <span className="text-xs tabular-nums text-muted-foreground">
          {inRetention
            ? "Tap anywhere when you need to breathe"
            : progressLine(protocol, session.step, session.unitsCompleted, session.totalUnits)}
        </span>
      </div>
      <div className="flex items-center justify-center gap-3 pb-10">
        {!inRetention ? (
          <Button
            type="button"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              (paused ? session.resume : session.pause)();
            }}
            className="app-tonal-control h-10 rounded-[16px] px-5 text-sm font-medium"
          >
            {paused ? "Resume" : "Pause"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
            session.end();
          }}
          className="app-tonal-control h-10 rounded-[16px] px-5 text-sm font-medium"
        >
          End
        </Button>
      </div>
    </div>
  );
};

export default BreathworkRunner;
