import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/core/button";
import { formatTime, secondsToTime } from "@/lib/types/workout";

import type { BreathStep, BreathworkProtocol } from "../data/protocols";
import {
  useBreathworkLogging,
  type BreathworkLogDestination,
} from "../hooks/useBreathworkLogging";
import { useBreathworkSession } from "../hooks/useBreathworkSession";
import BreathPacer from "./BreathPacer";
import ProtocolPicker from "./ProtocolPicker";

interface BreathworkDialogProps {
  isOpen: boolean;
  onClose: () => void;
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

const BreathworkPlayer = ({
  protocol,
  minutes,
  onClose,
}: {
  protocol: BreathworkProtocol;
  minutes?: number;
  onClose: () => void;
}) => {
  const session = useBreathworkSession(protocol, minutes);
  const { logSession, isLogging } = useBreathworkLogging();
  const [destination, setDestination] = useState<BreathworkLogDestination | null>(null);
  const [discarded, setDiscarded] = useState(false);
  const loggedRef = useRef(false);
  const startRef = useRef(session.start);
  startRef.current = session.start;

  useEffect(() => {
    startRef.current();
  }, []);

  const { status, saveOnExit, elapsedSeconds } = session;
  useEffect(() => {
    if (status !== "done" || loggedRef.current) return;
    loggedRef.current = true;
    if (saveOnExit && elapsedSeconds > 0) {
      logSession(protocol, elapsedSeconds)
        .then((result) => setDestination(result.destination))
        .catch(() => {
          // logSession already toasts; leave the done screen up unlogged.
        });
    } else {
      setDiscarded(true);
    }
  }, [status, saveOnExit, elapsedSeconds, logSession, protocol]);

  if (session.status === "done") {
    const unitsLabel =
      protocol.type === "paced"
        ? `${session.unitsCompleted} ${session.unitsCompleted === 1 ? "cycle" : "cycles"}`
        : `${session.unitsCompleted} ${session.unitsCompleted === 1 ? "round" : "rounds"}`;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
        <div className="flex flex-col items-center gap-1.5">
          <span className="app-kicker">{protocol.name}</span>
          <span className="text-5xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatTime(secondsToTime(session.elapsedSeconds))}
          </span>
          <span className="text-sm text-muted-foreground">{unitsLabel}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {destination === "workout"
            ? "Added to today's workout"
            : destination === "standalone"
              ? "Logged"
              : discarded
                ? "Session discarded — nothing logged"
                : isLogging
                  ? "Logging…"
                  : "Not logged"}
        </span>
        <Button
          type="button"
          onClick={onClose}
          className="app-primary-action h-11 rounded-[16px] px-8 text-sm font-medium"
        >
          Done
        </Button>
      </div>
    );
  }

  const paused = session.status === "paused";
  const inRetention = session.status === "retention";

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

const BreathworkDialog = ({ isOpen, onClose }: BreathworkDialogProps) => {
  const [selection, setSelection] = useState<{
    protocol: BreathworkProtocol;
    minutes?: number;
  } | null>(null);

  if (!isOpen) return null;

  const close = () => {
    setSelection(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {selection ? (
        <BreathworkPlayer
          key={`${selection.protocol.id}-${selection.minutes ?? ""}`}
          protocol={selection.protocol}
          minutes={selection.minutes}
          onClose={close}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
          <span className="app-kicker">Breathwork</span>
          <ProtocolPicker
            onBegin={(protocol, minutes) => setSelection({ protocol, minutes })}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={close}
            className="app-tonal-control h-10 rounded-[16px] px-5 text-sm font-medium"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
};

export default BreathworkDialog;
