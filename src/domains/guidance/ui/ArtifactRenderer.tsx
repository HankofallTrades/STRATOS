import type { FC } from "react";

import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import ProgramDraftArtifact from "@/domains/guidance/ui/artifacts/ProgramDraftArtifact";
import ProgramEditArtifact from "@/domains/guidance/ui/artifacts/ProgramEditArtifact";
import VolumeChartArtifact from "@/domains/guidance/ui/artifacts/VolumeChartArtifact";
import WorkoutDraftArtifact from "@/domains/guidance/ui/artifacts/WorkoutDraftArtifact";
import WorkoutEditArtifact from "@/domains/guidance/ui/artifacts/WorkoutEditArtifact";

// Artifact registry: artifact type -> renderer. `Record<CoachArtifact["type"]>`
// makes a new artifact type without a renderer a compile error, so this stays
// in lockstep with the CoachArtifact union (and apply routing in
// PresenceAgentProvider).
const artifactRegistry: {
  [T in CoachArtifact["type"]]: FC<{ artifact: Extract<CoachArtifact, { type: T }> }>;
} = {
  volume_chart: VolumeChartArtifact,
  workout_draft: WorkoutDraftArtifact,
  program_draft: ProgramDraftArtifact,
  program_edit: ProgramEditArtifact,
  workout_edit: WorkoutEditArtifact,
};

const ArtifactRenderer = ({ artifact }: { artifact: CoachArtifact }) => {
  const Component = artifactRegistry[artifact.type] as FC<{
    artifact: CoachArtifact;
  }>;
  return <Component artifact={artifact} />;
};

export default ArtifactRenderer;
