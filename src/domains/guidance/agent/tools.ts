import { z } from "zod";

import type {
  CoachToolCallMessage,
  CoachToolExecutionEnvironment,
  CoachToolName,
  CoachToolResultPayload,
} from "./contracts.js";

export interface CoachToolContext {
  proposeWorkout: () => Promise<CoachToolResultPayload>;
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
  propose_workout: {
    description:
      "Build a draft training session honoring the user's block focus, volume gaps, and any stated constraints (time available, sore area), and render it as a reviewable draft. Does NOT save; the user applies it.",
    execution: "client",
    inputSchema: emptyInputSchema,
    label: "Propose Workout",
    name: "propose_workout",
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
  get_training_volume: {
    description:
      "Read the user's current-week training volume by movement archetype (current vs. goal sets) so you can reason about volume gaps and render a chart.",
    execution: "server",
    inputSchema: emptyInputSchema,
    label: "Training Volume",
    name: "get_training_volume",
  },
} satisfies Record<string, CoachToolDefinition<Record<string, unknown>>>;

export const getCoachToolLabel = (toolName: CoachToolName) =>
  coachToolDefinitions[toolName].label;

export const executeCoachTool = async (
  toolCall: Pick<CoachToolCallMessage, "input" | "toolName">,
  context: CoachToolContext
): Promise<CoachToolResultPayload> => {
  switch (toolCall.toolName) {
    case "propose_workout": {
      return context.proposeWorkout();
    }
    case "get_recent_workout_summary":
    case "get_user_profile_summary":
    case "get_training_volume":
      throw new Error(
        `Coach tool ${toolCall.toolName} is server-executable and cannot run on the client.`
      );
    default:
      throw new Error(`Unknown coach tool: ${toolCall.toolName}`);
  }
};
