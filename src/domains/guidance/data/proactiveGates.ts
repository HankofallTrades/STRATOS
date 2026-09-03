import { differenceInCalendarDays, startOfDay } from "date-fns";

import type { DisplayArchetypeData } from "@/domains/analytics/data/volumeProgress";
import type { ActiveMesocycleProgram } from "@/domains/periodization";
import type { Workout } from "@/lib/types/workout";

export type ProactiveTier = "pulse" | "peek";
export type ProactiveTrigger = "app_open" | "workout_finished";

export interface ProactiveInsight {
  id: string;
  // The gate run that produced this insight. Merging back onto the surface
  // keys on it: see mergeProactiveInsights.
  trigger: ProactiveTrigger;
  tier: ProactiveTier;
  line: string;
  seedPrompt: string;
  cooldownHours: number;
  dedupeKey?: string;
}

export interface ProactiveGateSnapshot {
  trigger: ProactiveTrigger;
  now: Date;
  activeProgram: ActiveMesocycleProgram | null;
  workoutHistory: Workout[];
  volumeProgress: DisplayArchetypeData[];
  finishedWorkoutId?: string | null;
}

const MISSED_TRAINING_DAYS = 4;
const VOLUME_GAP_RATIO = 0.5;
const LATE_WEEK_FIRST_DAY = 5; // Friday (Monday = 1)

const isoWeekday = (date: Date): number => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const hoursUntilNextWeek = (now: Date): number => {
  const daysLeft = 8 - isoWeekday(now); // through end of Sunday
  return Math.max(1, daysLeft * 24 - now.getHours());
};

const daysSinceLastWorkout = (history: Workout[], now: Date): number | null => {
  if (history.length === 0) return null;
  const latest = history.reduce<Date | null>((latestDate, workout) => {
    const date = startOfDay(new Date(workout.date));
    return !latestDate || date > latestDate ? date : latestDate;
  }, null);
  if (!latest) return null;
  return differenceInCalendarDays(startOfDay(now), latest);
};

export const deriveProactiveInsights = (
  snapshot: ProactiveGateSnapshot
): ProactiveInsight[] => {
  const { trigger, now, activeProgram, workoutHistory, volumeProgress } =
    snapshot;

  if (trigger === "workout_finished") {
    if (!snapshot.finishedWorkoutId) return [];
    return [
      {
        id: "workout_finished",
        trigger,
        tier: "peek",
        line: "Session logged. Want a quick read on it?",
        seedPrompt:
          "I just finished a workout. Give me a quick read and anything to adjust.",
        cooldownHours: 720,
        dedupeKey: snapshot.finishedWorkoutId,
      },
    ];
  }

  const insights: Omit<ProactiveInsight, "trigger">[] = [];

  if (
    activeProgram &&
    activeProgram.current_week >= activeProgram.mesocycle.duration_weeks
  ) {
    insights.push({
      id: "program_ending",
      tier: "peek",
      line: "Your training block ends this week — want me to plan the next one?",
      seedPrompt:
        "My current program is ending. Review how it went and propose the next block.",
      cooldownHours: 72,
    });
  }

  const restDays = daysSinceLastWorkout(workoutHistory, now);
  if (restDays !== null && restDays >= MISSED_TRAINING_DAYS) {
    insights.push({
      id: "missed_training",
      tier: "peek",
      line: `It's been ${restDays} days since your last session — want a plan for today?`,
      seedPrompt:
        "It's been a few days since I trained. Propose a session for today.",
      cooldownHours: 48,
    });
  }

  if (isoWeekday(now) >= LATE_WEEK_FIRST_DAY) {
    const lagging = volumeProgress
      .filter(
        (archetype) =>
          archetype.goal > 0 &&
          archetype.totalSets < archetype.goal * VOLUME_GAP_RATIO
      )
      .sort(
        (left, right) => left.totalSets / left.goal - right.totalSets / right.goal
      )[0];
    if (lagging) {
      insights.push({
        id: "volume_gap_late_week",
        tier: "peek",
        line: `${lagging.name} volume is behind this week (${lagging.totalSets}/${lagging.goal} sets).`,
        seedPrompt:
          "Where is my training volume behind this week, and what should I do about it?",
        cooldownHours: hoursUntilNextWeek(now),
      });
    }
  }

  if (!activeProgram) {
    insights.push({
      id: "no_active_program",
      tier: "pulse",
      line: "No active program — ask the coach to build one.",
      seedPrompt: "Help me set up a training program.",
      cooldownHours: 168,
    });
  }

  return insights.map((insight) => ({ ...insight, trigger }));
};

// A nudge about the session just finished outranks the ambient set: only the
// first peek-tier insight is ever rendered, so this is the order the user sees.
const TRIGGER_RANK: Record<ProactiveTrigger, number> = {
  workout_finished: 0,
  app_open: 1,
};

/**
 * Fold one gate run's freshly derived insights into what is already on the
 * surface. A run owns exactly the insights its own trigger produces: it
 * replaces those wholesale, so one whose condition has passed disappears, and
 * it leaves every other trigger's insights alone.
 *
 * Both halves guard the same race. Finishing a workout dispatches the finished
 * id and then navigates home, and the navigation starts the app_open run a few
 * milliseconds behind the workout_finished one. Which of the two settles last
 * is a timing accident — cached queries resolve in a different order in the
 * wrap than on the web. A run that replaced the whole surface would, half the
 * time, delete the session nudge it was never in a position to derive; ranking
 * by trigger rather than by arrival keeps the surviving nudge on top either way.
 */
export const mergeProactiveInsights = ({
  derived,
  previous,
  trigger,
}: {
  derived: ProactiveInsight[];
  previous: ProactiveInsight[];
  trigger: ProactiveTrigger;
}): ProactiveInsight[] =>
  [
    ...derived,
    ...previous.filter(
      (existing) =>
        existing.trigger !== trigger &&
        !derived.some((incoming) => incoming.id === existing.id)
    ),
  ].sort((left, right) => TRIGGER_RANK[left.trigger] - TRIGGER_RANK[right.trigger]);
