import { z } from "zod";

import type {
  CoachToolCallMessage,
  CoachToolExecutionEnvironment,
  CoachToolName,
  CoachToolResultPayload,
} from "./contracts.js";
import type { GeneratedWorkoutSummary } from "@/domains/guidance/hooks/useWorkoutGenerator";

export interface CoachToolContext {
  generateWorkout: () => GeneratedWorkoutSummary;
}

interface CoachToolDefinition<TInput extends Record<string, unknown>> {
  description: string;
  execution: CoachToolExecutionEnvironment;
  inputSchema: z.ZodType<TInput>;
  label: string;
  name: CoachToolName;
}

const emptyInputSchema = z.object({});

export const coachToolDefinitions = {
  generate_strength_workout: {
    description:
      "Create a workout in the app using the user's current block focus and movement-archetype volume gaps, then open the workout screen.",
    execution: "client",
    inputSchema: emptyInputSchema,
    label: "Create Block-Aware Workout",
    name: "generate_strength_workout",
  },
  get_recent_workout_summary: {
    description:
      "Read the user's recent completed workout history from STRATOS so you can give context-aware coaching.",
    execution: "server",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(5).default(3),
    }),
    label: "Recent Workout Summary",
    name: "get_recent_workout_summary",
  },
  get_user_profile_summary: {
    description:
      "Read the user's STRATOS profile summary, including basic goals and body metrics when available.",
    execution: "server",
    inputSchema: emptyInputSchema,
    label: "User Profile Summary",
    name: "get_user_profile_summary",
  },
} satisfies Record<string, CoachToolDefinition<Record<string, unknown>>>;

export const getCoachToolLabel = (toolName: CoachToolName) =>
  coachToolDefinitions[toolName].label;

export const executeCoachTool = (
  toolCall: Pick<CoachToolCallMessage, "input" | "toolName">,
  context: CoachToolContext
): CoachToolResultPayload => {
  switch (toolCall.toolName) {
    case "generate_strength_workout": {
      const summary = context.generateWorkout();
      return {
        data: summary,
        message: summary.message,
        nextRoute: "/workout",
      };
    }
    case "get_recent_workout_summary":
    case "get_user_profile_summary":
      throw new Error(
        `Coach tool ${toolCall.toolName} is server-executable and cannot run on the client.`
      );
    default:
      throw new Error(`Unknown coach tool: ${toolCall.toolName}`);
  }
};
