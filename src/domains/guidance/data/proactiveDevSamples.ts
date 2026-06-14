import type { ProactiveInsight } from "@/domains/guidance/data/proactiveGates";

/**
 * Representative samples of every proactive insight, used only by the Coach dev
 * tools to force an insight into the surface regardless of its real-world gate
 * condition or active cooldown. Keep these in sync with the insight definitions
 * in `deriveProactiveInsights` (proactiveGates.ts).
 */
export const devProactiveSamples: ProactiveInsight[] = [
  {
    id: "program_ending",
    tier: "peek",
    line: "Your training block ends this week — want me to plan the next one?",
    seedPrompt:
      "My current program is ending. Review how it went and propose the next block.",
    cooldownHours: 72,
  },
  {
    id: "missed_training",
    tier: "peek",
    line: "It's been 5 days since your last session — want a plan for today?",
    seedPrompt:
      "It's been a few days since I trained. Propose a session for today.",
    cooldownHours: 48,
  },
  {
    id: "volume_gap_late_week",
    tier: "peek",
    line: "Push volume is behind this week (4/10 sets).",
    seedPrompt:
      "Where is my training volume behind this week, and what should I do about it?",
    cooldownHours: 48,
  },
  {
    id: "no_active_program",
    tier: "pulse",
    line: "No active program — ask the coach to build one.",
    seedPrompt: "Help me set up a training program.",
    cooldownHours: 168,
  },
  {
    id: "workout_finished",
    tier: "peek",
    line: "Session logged. Want a quick read on it?",
    seedPrompt:
      "I just finished a workout. Give me a quick read and anything to adjust.",
    cooldownHours: 720,
    dedupeKey: "dev",
  },
];
