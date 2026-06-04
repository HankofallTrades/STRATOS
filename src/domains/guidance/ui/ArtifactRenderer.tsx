import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import VolumeChartArtifact from "@/domains/guidance/ui/artifacts/VolumeChartArtifact";
import WorkoutDraftArtifact from "@/domains/guidance/ui/artifacts/WorkoutDraftArtifact";

const ArtifactRenderer = ({ artifact }: { artifact: CoachArtifact }) => {
  switch (artifact.type) {
    case "volume_chart":
      return <VolumeChartArtifact artifact={artifact} />;
    case "workout_draft":
      return <WorkoutDraftArtifact artifact={artifact} />;
    default:
      return null;
  }
};

export default ArtifactRenderer;
