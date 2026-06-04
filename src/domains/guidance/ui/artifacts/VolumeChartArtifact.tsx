import type { CoachArtifact } from "@/domains/guidance/agent/contracts";

type VolumeChart = Extract<CoachArtifact, { type: "volume_chart" }>;

const VolumeChartArtifact = ({ artifact }: { artifact: VolumeChart }) => {
  const max = Math.max(
    1,
    ...artifact.series.map((point) => Math.max(point.current, point.goal))
  );

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {artifact.title}
      </p>
      <div className="mt-3 space-y-2">
        {artifact.series.map((point) => (
          <div key={point.label} className="space-y-1">
            <div className="flex justify-between text-xs text-foreground">
              <span>{point.label}</span>
              <span className="text-muted-foreground">
                {point.current}/{point.goal}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
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
