import { devProactiveSamples } from "@/domains/guidance/data/proactiveDevSamples";
import type { ProactiveInsight } from "@/domains/guidance/data/proactiveGates";

interface DevToolsPanelProps {
  devResetCooldowns: () => void;
  devTriggerInsight: (insight: ProactiveInsight) => void;
  onTriggered: () => void;
}

const DevToolsPanel = ({
  devResetCooldowns,
  devTriggerInsight,
  onTriggered,
}: DevToolsPanelProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-amber-200/80">
          Coach dev tools
        </p>
        <button
          type="button"
          onClick={() => devResetCooldowns()}
          className="rounded-full border border-amber-500/40 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:bg-amber-500/15"
        >
          Reset cooldowns
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Trigger forces an insight into the surface, ignoring its gate condition
        and cooldown.
      </p>
      <div className="flex flex-col gap-2">
        {devProactiveSamples.map((sample) => (
          <div
            key={sample.id}
            className="flex items-center gap-3 rounded-[14px] border border-white/[0.07] bg-white/[0.025] px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                {sample.id} · {sample.tier}
              </p>
              <p className="truncate text-xs text-foreground/85">
                {sample.line}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                devTriggerInsight(sample);
                onTriggered();
              }}
              className="shrink-0 rounded-full bg-amber-500/20 px-3 py-1.5 text-xs text-amber-100 transition-colors hover:bg-amber-500/30"
            >
              Trigger
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DevToolsPanel;
