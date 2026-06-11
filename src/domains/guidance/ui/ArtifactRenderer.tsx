import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import ProgramDraftArtifact from "@/domains/guidance/ui/artifacts/ProgramDraftArtifact";
import ProgramEditArtifact from "@/domains/guidance/ui/artifacts/ProgramEditArtifact";
import VolumeChartArtifact from "@/domains/guidance/ui/artifacts/VolumeChartArtifact";
import WorkoutDraftArtifact from "@/domains/guidance/ui/artifacts/WorkoutDraftArtifact";
import WorkoutEditArtifact from "@/domains/guidance/ui/artifacts/WorkoutEditArtifact";

const ArtifactRenderer = ({ artifact }: { artifact: CoachArtifact }) => {
  switch (artifact.type) {
    case "volume_chart":
      return <VolumeChartArtifact artifact={artifact} />;
    case "workout_draft":
      return <WorkoutDraftArtifact artifact={artifact} />;
    case "program_draft":
      return <ProgramDraftArtifact artifact={artifact} />;
    case "program_edit":
      return <ProgramEditArtifact artifact={artifact} />;
    case "workout_edit":
      return <WorkoutEditArtifact artifact={artifact} />;
    default:
      return null;
  }
};

export default ArtifactRenderer;
