export type BreathStepKind = "inhale" | "hold" | "exhale" | "retention" | "recovery";

export interface BreathStep {
  kind: BreathStepKind;
  /** Planned seconds; null = open-ended (retention: user taps to continue). */
  seconds: number | null;
  /** 0-based cycle (paced) or round (rounds) index. */
  unit: number;
  /** 1-based breath number within a round (rounds protocols only). */
  breath?: number;
}

export interface PacedProtocol {
  id: string;
  type: "paced";
  name: string;
  intent: string;
  exerciseName: string;
  phases: { kind: "inhale" | "hold" | "exhale"; seconds: number }[];
  defaultMinutes: number;
  minuteOptions: number[];
}

export interface RoundsProtocol {
  id: string;
  type: "rounds";
  name: string;
  intent: string;
  exerciseName: string;
  rounds: number;
  breathsPerRound: number;
  inhaleSeconds: number;
  exhaleSeconds: number;
  recoveryHoldSeconds: number;
}

export type BreathworkProtocol = PacedProtocol | RoundsProtocol;

export const BREATHWORK_PROTOCOLS: BreathworkProtocol[] = [
  {
    id: "box",
    type: "paced",
    name: "Box Breathing",
    intent: "Steady the mind",
    exerciseName: "Box Breathing",
    phases: [
      { kind: "inhale", seconds: 4 },
      { kind: "hold", seconds: 4 },
      { kind: "exhale", seconds: 4 },
      { kind: "hold", seconds: 4 },
    ],
    defaultMinutes: 3,
    minuteOptions: [2, 3, 5, 10],
  },
  {
    id: "four-seven-eight",
    type: "paced",
    name: "4-7-8",
    intent: "Downshift",
    exerciseName: "4-7-8 Breathing",
    phases: [
      { kind: "inhale", seconds: 4 },
      { kind: "hold", seconds: 7 },
      { kind: "exhale", seconds: 8 },
    ],
    defaultMinutes: 2,
    minuteOptions: [1, 2, 3, 5],
  },
  {
    id: "coherent",
    type: "paced",
    name: "Coherent Breathing",
    intent: "Settle the system",
    exerciseName: "Coherent Breathing",
    phases: [
      { kind: "inhale", seconds: 5.5 },
      { kind: "exhale", seconds: 5.5 },
    ],
    defaultMinutes: 5,
    minuteOptions: [3, 5, 10, 15],
  },
  {
    id: "breath-rounds",
    type: "rounds",
    name: "Breath Rounds",
    intent: "Energize",
    exerciseName: "Breath Rounds",
    rounds: 3,
    breathsPerRound: 30,
    inhaleSeconds: 1.7,
    exhaleSeconds: 1.3,
    recoveryHoldSeconds: 15,
  },
];

const cycleSeconds = (protocol: PacedProtocol) =>
  protocol.phases.reduce((sum, phase) => sum + phase.seconds, 0);

export const totalUnits = (protocol: BreathworkProtocol, minutes?: number): number => {
  if (protocol.type === "rounds") return protocol.rounds;
  const targetSeconds = (minutes ?? protocol.defaultMinutes) * 60;
  return Math.max(1, Math.ceil(targetSeconds / cycleSeconds(protocol)));
};

export const buildSteps = (
  protocol: BreathworkProtocol,
  minutes?: number
): BreathStep[] => {
  const steps: BreathStep[] = [];
  if (protocol.type === "paced") {
    const cycles = totalUnits(protocol, minutes);
    for (let unit = 0; unit < cycles; unit++) {
      for (const phase of protocol.phases) {
        steps.push({ kind: phase.kind, seconds: phase.seconds, unit });
      }
    }
    return steps;
  }
  for (let unit = 0; unit < protocol.rounds; unit++) {
    for (let breath = 1; breath <= protocol.breathsPerRound; breath++) {
      steps.push({ kind: "inhale", seconds: protocol.inhaleSeconds, unit, breath });
      steps.push({ kind: "exhale", seconds: protocol.exhaleSeconds, unit, breath });
    }
    steps.push({ kind: "retention", seconds: null, unit });
    steps.push({ kind: "recovery", seconds: protocol.recoveryHoldSeconds, unit });
  }
  return steps;
};

export const completedUnits = (
  protocol: BreathworkProtocol,
  steps: BreathStep[],
  nextStepIndex: number
): number => {
  if (protocol.type === "paced") {
    return Math.floor(nextStepIndex / protocol.phases.length);
  }
  return steps.slice(0, nextStepIndex).filter((step) => step.kind === "recovery").length;
};

export const shouldSaveEarlyExit = (
  protocol: BreathworkProtocol,
  steps: BreathStep[],
  nextStepIndex: number
): boolean => completedUnits(protocol, steps, nextStepIndex) >= 1;

/** Resolve the protocol a catalogue breathwork exercise runs, by its exercise name. */
export const protocolForExerciseName = (
  exerciseName: string
): BreathworkProtocol | null =>
  BREATHWORK_PROTOCOLS.find((protocol) => protocol.exerciseName === exerciseName) ??
  null;
