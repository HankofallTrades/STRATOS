import { z } from "zod";

import type {
  CoachToolCallMessage,
  CoachToolExecutionEnvironment,
  CoachToolName,
  CoachToolResultPayload,
} from "./contracts.js";

export interface CoachToolContext {
  proposeWorkout: () => Promise<CoachToolResultPayload>;
  getProgramContext: () => Promise<CoachToolResultPayload>;
  proposeProgram: (input: Record<string, unknown>) => Promise<CoachToolResultPayload>;
  proposeProgramEdit: (input: Record<string, unknown>) => Promise<CoachToolResultPayload>;
  proposeActiveWorkoutEdit: (
    input: Record<string, unknown>
  ) => Promise<CoachToolResultPayload>;
}

interface CoachToolDefinition<TInput extends Record<string, unknown>> {
  description: string;
  execution: CoachToolExecutionEnvironment;
  inputSchema: z.ZodType<TInput>;
  label: string;
  name: CoachToolName;
}

const emptyInputSchema = z.object({});

const sessionFocusInputSchema = z.enum([
  "strength",
  "hypertrophy",
  "mixed",
  "recovery",
  "speed",
  "zone2",
  "zone5",
]);

export const proposeProgramInputSchema = z.object({
  name: z.string().min(1),
  goalFocus: sessionFocusInputSchema,
  durationWeeks: z.number().int().min(4).max(12),
  rationale: z.string().min(1),
  notes: z.string().optional(),
  sessions: z
    .array(
      z.object({
        name: z.string().min(1),
        sessionFocus: sessionFocusInputSchema.nullish(),
        setsPerExercise: z.number().int().min(1).max(10).nullish(),
        repRange: z.string().nullish(),
        progressionRule: z.string().nullish(),
        exercises: z
          .array(
            z.object({
              exerciseName: z.string().min(1),
              targetSets: z.number().int().min(1).max(10).nullish(),
              targetReps: z.string().nullish(),
              loadIncrementKg: z.number().nullish(),
              notes: z.string().nullish(),
            })
          )
          .min(1),
      })
    )
    .min(1)
    .max(7),
});
export type ProposeProgramInput = z.infer<typeof proposeProgramInputSchema>;

export const proposeProgramEditInputSchema = z.object({
  rationale: z.string().min(1),
  ops: z
    .array(
      z.discriminatedUnion("op", [
        z.object({
          op: z.literal("replace_exercise"),
          sessionName: z.string().min(1),
          exerciseName: z.string().min(1),
          newExerciseName: z.string().min(1),
        }),
        z.object({
          op: z.literal("add_exercise"),
          sessionName: z.string().min(1),
          exerciseName: z.string().min(1),
          targetSets: z.number().int().min(1).max(10).nullish(),
          targetReps: z.string().nullish(),
        }),
        z.object({
          op: z.literal("remove_exercise"),
          sessionName: z.string().min(1),
          exerciseName: z.string().min(1),
        }),
        z.object({
          op: z.literal("update_targets"),
          sessionName: z.string().min(1),
          exerciseName: z.string().min(1),
          targetSets: z.number().int().min(1).max(10).nullish(),
          targetReps: z.string().nullish(),
          loadIncrementKg: z.number().nullish(),
        }),
      ])
    )
    .min(1),
});
export type ProposeProgramEditInput = z.infer<typeof proposeProgramEditInputSchema>;

export const proposeActiveWorkoutEditInputSchema = z.object({
  rationale: z.string().min(1),
  ops: z
    .array(
      z.discriminatedUnion("op", [
        z.object({
          op: z.literal("swap_exercise"),
          exerciseName: z.string().min(1),
          newExerciseName: z.string().min(1),
        }),
        z.object({
          op: z.literal("add_exercise"),
          exerciseName: z.string().min(1),
        }),
        z.object({
          op: z.literal("remove_exercise"),
          exerciseName: z.string().min(1),
        }),
      ])
    )
    .min(1),
});
export type ProposeActiveWorkoutEditInput = z.infer<
  typeof proposeActiveWorkoutEditInputSchema
>;

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
  get_program_context: {
    description:
      "Read the user's active training program (sessions, exercises, targets, current week) and the exercise catalog grouped by movement archetype. Always call this before proposing or editing a program so you use exact catalog names.",
    execution: "client",
    inputSchema: emptyInputSchema,
    label: "Program Context",
    name: "get_program_context",
  },
  propose_program: {
    description:
      "Draft a complete training program (mesocycle) for review: name, goal focus, duration in weeks, and 1-7 sessions each with exercises from the catalog (exact names). Returns a reviewable draft; it does NOT save. The user applies it explicitly.",
    execution: "client",
    inputSchema: proposeProgramInputSchema,
    label: "Propose Program",
    name: "propose_program",
  },
  propose_program_edit: {
    description:
      "Propose edits to the user's active program: replace/add/remove exercises in a named session, or update target sets/reps/load increment. Returns a before/after card; it does NOT save. The user applies it explicitly.",
    execution: "client",
    inputSchema: proposeProgramEditInputSchema,
    label: "Propose Program Edit",
    name: "propose_program_edit",
  },
  propose_active_workout_edit: {
    description:
      "Propose changes to the workout currently in progress: swap an exercise for another catalog exercise, add one, or remove one. Returns a confirm card; it does NOT change anything until the user applies it.",
    execution: "client",
    inputSchema: proposeActiveWorkoutEditInputSchema,
    label: "Propose Workout Edit",
    name: "propose_active_workout_edit",
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
    case "get_program_context":
      return context.getProgramContext();
    case "propose_program":
      return context.proposeProgram(toolCall.input);
    case "propose_program_edit":
      return context.proposeProgramEdit(toolCall.input);
    case "propose_active_workout_edit":
      return context.proposeActiveWorkoutEdit(toolCall.input);
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
