import { z } from "zod";

export type ScreenName =
  | "home"
  | "workout"
  | "analytics"
  | "profile"
  | "other";

export interface ScreenContext {
  route: string;
  screen: ScreenName;
  focus?: {
    workoutInProgress?: boolean;
    activeWorkoutId?: string;
    analyticsRange?: { start: string; end: string };
  };
}

export const screenContextSchema = z.object({
  route: z.string(),
  screen: z.enum(["home", "workout", "analytics", "profile", "other"]),
  focus: z
    .object({
      workoutInProgress: z.boolean().optional(),
      activeWorkoutId: z.string().optional(),
      analyticsRange: z
        .object({ start: z.string(), end: z.string() })
        .optional(),
    })
    .optional(),
});

const screenForRoute = (route: string): ScreenName => {
  if (route === "/") return "home";
  if (route.startsWith("/workout")) return "workout";
  if (route.startsWith("/analytics")) return "analytics";
  if (route.startsWith("/profile")) return "profile";
  return "other";
};

export interface BuildScreenContextInput {
  route: string;
  workoutInProgress?: boolean;
  activeWorkoutId?: string | null;
  analyticsRange?: { start: string; end: string } | null;
}

export const buildScreenContext = ({
  route,
  workoutInProgress,
  activeWorkoutId,
  analyticsRange,
}: BuildScreenContextInput): ScreenContext => {
  const screen = screenForRoute(route);
  const focus: NonNullable<ScreenContext["focus"]> = {};
  if (typeof workoutInProgress === "boolean")
    focus.workoutInProgress = workoutInProgress;
  if (activeWorkoutId) focus.activeWorkoutId = activeWorkoutId;
  if (screen === "analytics" && analyticsRange)
    focus.analyticsRange = analyticsRange;
  return Object.keys(focus).length > 0
    ? { route, screen, focus }
    : { route, screen };
};

export const formatScreenContextForPrompt = (
  context: ScreenContext | undefined
): string => {
  if (!context) return "";
  const bits = [`route ${context.route}`, `screen ${context.screen}`];
  if (context.focus?.workoutInProgress) bits.push("a workout is in progress");
  if (context.focus?.analyticsRange)
    bits.push(
      `analytics range ${context.focus.analyticsRange.start}..${context.focus.analyticsRange.end}`
    );
  return `\n\nCurrent context: the user is on ${bits.join(", ")}. Use this to ground your answer; do not restate it.`;
};
