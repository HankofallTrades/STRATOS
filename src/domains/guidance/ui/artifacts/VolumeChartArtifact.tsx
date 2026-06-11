import type { CoachArtifact } from "@/domains/guidance/agent/contracts";

type VolumeChart = Extract<CoachArtifact, { type: "volume_chart" }>;

const VolumeChartArtifact = ({ artifact }: { artifact: VolumeChart }) => {
  const max = Math.max(
    1,
    ...artifact.series.map((point) => Math.max(point.current, point.goal))
  );

  return (
    <div className="stone-chip rounded-[20px] p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] verdigris-text">
        {artifact.title}
      </p>
      <div className="mt-3 space-y-2.5">
        {artifact.series.map((point) => (
          <div key={point.label} className="space-y-1">
            <div className="flex justify-between text-xs text-foreground/90">
              <span>{point.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {point.current}/{point.goal}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[var(--stone-accent-text)]"
                style={{ width: `${Math.min(100, (point.current / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VolumeChartArtifact;
