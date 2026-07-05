import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/core/button";
import { formatTime, secondsToTime } from "@/lib/types/workout";

import type { BreathworkProtocol } from "../data/protocols";
import {
  useBreathworkLogging,
  type BreathworkLogDestination,
} from "../hooks/useBreathworkLogging";
import BreathworkRunner, { type BreathworkResult } from "./BreathworkRunner";
import ProtocolPicker from "./ProtocolPicker";

interface BreathworkDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Standalone breathwork: pick a protocol, breathe, and log the run. When a
 * workout is active the run lands as a new breathwork exercise in it; otherwise
 * it saves as a standalone single-exercise log (both handled by useBreathworkLogging).
 */
const StandalonePlayer = ({
  protocol,
  minutes,
  onClose,
}: {
  protocol: BreathworkProtocol;
  minutes?: number;
  onClose: () => void;
}) => {
  const { logSession, isLogging } = useBreathworkLogging();
  const [result, setResult] = useState<BreathworkResult | null>(null);
  const [destination, setDestination] = useState<BreathworkLogDestination | null>(null);
  const [discarded, setDiscarded] = useState(false);
  const loggedRef = useRef(false);

  const handleDone = useCallback(
    (finished: BreathworkResult) => {
      setResult(finished);
      if (loggedRef.current) return;
      loggedRef.current = true;
      if (finished.saveOnExit && finished.elapsedSeconds > 0) {
        logSession(protocol, finished.elapsedSeconds)
          .then((logged) => setDestination(logged.destination))
          .catch(() => {
            // logSession already toasts; leave the summary up, unlogged.
          });
      } else {
        setDiscarded(true);
      }
    },
    [logSession, protocol]
  );

  if (result) {
    const unitsLabel =
      protocol.type === "paced"
        ? `${result.unitsCompleted} ${result.unitsCompleted === 1 ? "cycle" : "cycles"}`
        : `${result.unitsCompleted} ${result.unitsCompleted === 1 ? "round" : "rounds"}`;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
        <div className="flex flex-col items-center gap-1.5">
          <span className="app-kicker">{protocol.name}</span>
          <span className="text-5xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatTime(secondsToTime(result.elapsedSeconds))}
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

  return <BreathworkRunner protocol={protocol} minutes={minutes} onDone={handleDone} />;
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
        <StandalonePlayer
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
