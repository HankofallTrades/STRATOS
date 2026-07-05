import { useState } from "react";

import { Button } from "@/components/core/button";

import {
  BREATHWORK_PROTOCOLS,
  type BreathworkProtocol,
} from "../data/protocols";

interface ProtocolPickerProps {
  onBegin: (protocol: BreathworkProtocol, minutes?: number) => void;
}

const signature = (protocol: BreathworkProtocol): string =>
  protocol.type === "paced"
    ? protocol.phases.map((phase) => phase.seconds).join("·")
    : `${protocol.rounds} × ${protocol.breathsPerRound}`;

const ProtocolPicker = ({ onBegin }: ProtocolPickerProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [minutesById, setMinutesById] = useState<Record<string, number>>({});

  const selected =
    BREATHWORK_PROTOCOLS.find((protocol) => protocol.id === selectedId) ?? null;
  const selectedMinutes =
    selected?.type === "paced"
      ? (minutesById[selected.id] ?? selected.defaultMinutes)
      : undefined;

  return (
    <div className="flex w-full max-w-md flex-col gap-2.5">
      {BREATHWORK_PROTOCOLS.map((protocol) => {
        const isSelected = protocol.id === selectedId;
        return (
          <button
            key={protocol.id}
            type="button"
            onClick={() => setSelectedId(protocol.id)}
            aria-pressed={isSelected}
            className={`stone-chip rounded-[18px] px-4 py-3 text-left transition-colors ${
              isSelected
                ? "bg-[rgba(var(--stone-accent-rgb),0.16)] text-foreground"
                : "text-foreground/85 hover:bg-white/[0.05] hover:text-foreground"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold tracking-tight">
                {protocol.name}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {signature(protocol)}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {protocol.intent}
            </div>
            {isSelected && protocol.type === "paced" ? (
              <div className="mt-2.5 flex gap-1.5">
                {protocol.minuteOptions.map((minutes) => {
                  const isActive =
                    (minutesById[protocol.id] ?? protocol.defaultMinutes) === minutes;
                  return (
                    <span
                      key={minutes}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMinutesById((prev) => ({ ...prev, [protocol.id]: minutes }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          setMinutesById((prev) => ({ ...prev, [protocol.id]: minutes }));
                        }
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs tabular-nums transition-colors ${
                        isActive
                          ? "bg-[rgba(var(--stone-accent-rgb),0.35)] text-foreground"
                          : "bg-white/[0.04] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {minutes}m
                    </span>
                  );
                })}
              </div>
            ) : null}
          </button>
        );
      })}
      <Button
        type="button"
        disabled={!selected}
        onClick={() => selected && onBegin(selected, selectedMinutes)}
        className="app-primary-action mt-3 h-11 rounded-[16px] text-sm font-medium"
      >
        Begin
      </Button>
    </div>
  );
};

export default ProtocolPicker;
