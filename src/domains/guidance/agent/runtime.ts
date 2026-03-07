import {
  ToolLoopAgent,
  stepCountIs,
  tool,
  type JSONValue,
  type ModelMessage,
} from "ai";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import type { Database } from "../../../lib/integrations/supabase/types.js";
import { createLlmModel } from "../../../lib/llm/llmClient.js";
import { coachPrompts } from "../../../lib/prompts/coachPrompts.js";
import {
  createCoachAssistantMessage,
  createCoachErrorResponse,
  createCoachToolCallMessage,
  createCoachToolResultMessage,
  type CoachAgentAuthContext,
  type CoachAgentRequest,
  type CoachAgentResponse,
  type CoachConversationMessage,
  type CoachToolExecutionEnvironment,
  type CoachToolName,
  type CoachToolResultPayload,
} from "./contracts.js";
import { coachToolDefinitions } from "./tools.js";

interface CoachAgentRuntimeEnvironment {
  localLlmUrl?: string;
  openRouterApiKey?: string;
  openRouterApiUrl: string;
  openRouterAppName: string;
  openRouterReferer: string;
  supabaseAnonKey?: string;
  supabaseUrl?: string;
}

interface RunCoachAgentTurnParams extends CoachAgentRequest {
  env: CoachAgentRuntimeEnvironment;
}

interface CoachServerDataContext {
  supabase: SupabaseClient<Database> | null;
  user: User | null;
}

interface RecentWorkoutSummaryRow {
  duration_seconds: number | null;
  exercise_names: string[] | null;
  total_completed_sets: number | null;
  workout_created_at: string | null;
  workout_id: string;
}

const coachAgentInstructions = `${coachPrompts.systemPromptV1}

You are operating as an AI agent inside the STRATOS Coach screen.

Tool rules:
- Use \`get_user_profile_summary\` when profile data would materially improve the answer.
- Use \`get_recent_workout_summary\` when recent training history is relevant.
- Use \`generate_strength_workout\` when the user explicitly wants you to create, start, or generate a strength workout in the app.
- Call at most one client tool in a single turn.
- Never invent tool outputs. If a tool returns limited data, say so plainly.
- After any tool result, respond with a concise coaching follow-up.`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const formatProfileSummary = (profile: Record<string, unknown>) => {
  const parts = [
    typeof profile.focus === "string" ? `Focus: ${profile.focus}.` : null,
    typeof profile.age === "number" ? `Age: ${profile.age}.` : null,
    typeof profile.weight === "number"
      ? `Weight: ${profile.weight}${typeof profile.preferred_weight_unit === "string" ? ` ${profile.preferred_weight_unit}` : ""}.`
      : null,
    typeof profile.height === "number"
      ? `Height: ${profile.height}${typeof profile.preferred_height_unit === "string" ? ` ${profile.preferred_height_unit}` : ""}.`
      : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "The user profile exists, but it does not contain enough completed fields to summarize yet.";
  }

  return parts.join(" ");
};

const formatDurationMinutes = (durationSeconds: number | null) => {
  if (!durationSeconds || durationSeconds <= 0) {
    return "duration unknown";
  }

  const minutes = Math.round(durationSeconds / 60);
  return `${minutes} min`;
};

const formatRecentWorkoutSummary = (workouts: RecentWorkoutSummaryRow[]) => {
  if (workouts.length === 0) {
    return "No recent workouts were found.";
  }

  return workouts
    .map(workout => {
      const exerciseNames =
        workout.exercise_names && workout.exercise_names.length > 0
          ? workout.exercise_names.join(", ")
          : "exercise names unavailable";

      const completedSets =
        typeof workout.total_completed_sets === "number"
          ? `${workout.total_completed_sets} completed sets`
          : "completed set count unavailable";

      const completedAt = workout.workout_created_at
        ? new Date(workout.workout_created_at).toLocaleString()
        : "time unavailable";

      return `${completedAt}: ${completedSets}; ${formatDurationMinutes(
        workout.duration_seconds
      )}; exercises: ${exerciseNames}.`;
    })
    .join(" ");
};

const createCoachSupabaseClient = (
  env: CoachAgentRuntimeEnvironment,
  accessToken?: string | null
) => {
  if (!env.supabaseUrl || !env.supabaseAnonKey || !accessToken) {
    return null;
  }

  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

const createCoachServerDataContext = async (
  env: CoachAgentRuntimeEnvironment,
  auth?: CoachAgentAuthContext
): Promise<CoachServerDataContext> => {
  const supabase = createCoachSupabaseClient(env, auth?.supabaseAccessToken);
  if (!supabase || !auth?.supabaseAccessToken) {
    return {
      supabase: null,
      user: null,
    };
  }

  const { data, error } = await supabase.auth.getUser(auth.supabaseAccessToken);
  if (error || !data.user) {
    return {
      supabase,
      user: null,
    };
  }

  return {
    supabase,
    user: data.user,
  };
};

const createServerToolPayload = (
  message: string,
  data?: unknown
): CoachToolResultPayload => ({
  ...(typeof data === "undefined" ? {} : { data }),
  message,
});

const createCoachAgentTools = (context: CoachServerDataContext) => ({
  generate_strength_workout: tool({
    description: coachToolDefinitions.generate_strength_workout.description,
    inputSchema: coachToolDefinitions.generate_strength_workout.inputSchema,
  }),
  get_recent_workout_summary: tool({
    description: coachToolDefinitions.get_recent_workout_summary.description,
    inputSchema: coachToolDefinitions.get_recent_workout_summary.inputSchema,
    execute: async ({ limit }) => {
      if (!context.supabase || !context.user) {
        return createServerToolPayload(
          "The user is not authenticated, so recent workout history is unavailable."
        );
      }

      const { data, error } = await context.supabase.rpc(
        "get_recent_workouts_summary",
        {
          p_limit: limit,
          p_user_id: context.user.id,
        }
      );

      if (error) {
        return createServerToolPayload(
          `Recent workout history could not be loaded: ${error.message}`
        );
      }

      const workouts = ((data ?? []) as RecentWorkoutSummaryRow[]).map(
        workout => ({
          ...workout,
          exercise_names: Array.isArray(workout.exercise_names)
            ? workout.exercise_names
            : [],
        })
      );

      return createServerToolPayload(formatRecentWorkoutSummary(workouts), {
        workouts,
      });
    },
  }),
  get_user_profile_summary: tool({
    description: coachToolDefinitions.get_user_profile_summary.description,
    inputSchema: coachToolDefinitions.get_user_profile_summary.inputSchema,
    execute: async () => {
      if (!context.supabase || !context.user) {
        return createServerToolPayload(
          "The user is not authenticated, so profile data is unavailable."
        );
      }

      const { data, error } = await context.supabase
        .from("profiles")
        .select(
          "age, focus, height, preferred_distance_unit, preferred_height_unit, preferred_weight_unit, weight"
        )
        .eq("id", context.user.id)
        .maybeSingle();

      if (error) {
        return createServerToolPayload(
          `Profile data could not be loaded: ${error.message}`
        );
      }

      if (!data) {
        return createServerToolPayload("The user has not completed a profile yet.");
      }

      return createServerToolPayload(formatProfileSummary(data), {
        profile: data,
      });
    },
  }),
});

type CoachToolSet = ReturnType<typeof createCoachAgentTools>;

const coachToolExecutionByName: Record<
  CoachToolName,
  CoachToolExecutionEnvironment
> = {
  generate_strength_workout: "client",
  get_recent_workout_summary: "server",
  get_user_profile_summary: "server",
};

const coachToolResultPayloadToModelOutput = (
  payload: CoachToolResultPayload,
  isError?: boolean
) => {
  if (isError) {
    return {
      type: "error-text" as const,
      value: payload.message,
    };
  }

  if (typeof payload.data === "undefined" && !payload.nextRoute) {
    return {
      type: "text" as const,
      value: payload.message,
    };
  }

  return {
    type: "json" as const,
    value: JSON.parse(JSON.stringify(payload)) as JSONValue,
  };
};

const coachMessagesToModelMessages = (
  messages: CoachConversationMessage[]
): ModelMessage[] =>
  messages.reduce<ModelMessage[]>((modelMessages, message) => {
    switch (message.kind) {
      case "user":
        modelMessages.push({ content: message.content, role: "user" });
        return modelMessages;
      case "assistant":
        modelMessages.push({ content: message.content, role: "assistant" });
        return modelMessages;
      case "tool_call":
        modelMessages.push({
          content: [
            {
              input: message.input,
              toolCallId: message.toolCallId,
              toolName: message.toolName,
              type: "tool-call",
            },
          ],
          role: "assistant",
        });
        return modelMessages;
      case "tool_result":
        modelMessages.push({
          content: [
            {
              output: coachToolResultPayloadToModelOutput(
                message.output,
                message.isError
              ),
              toolCallId: message.toolCallId,
              toolName: message.toolName,
              type: "tool-result",
            },
          ],
          role: "tool",
        });
        return modelMessages;
      case "error":
        return modelMessages;
      default:
        return modelMessages;
    }
  }, []);

const parseToolResultPayload = (
  value: unknown
): { isError: boolean; payload: CoachToolResultPayload } => {
  if (!isRecord(value) || typeof value.type !== "string") {
    return {
      isError: false,
      payload: {
        message:
          typeof value === "string"
            ? value
            : "Tool execution returned an unsupported payload.",
      },
    };
  }

  switch (value.type) {
    case "text":
      return {
        isError: false,
        payload: {
          message: typeof value.value === "string" ? value.value : "",
        },
      };
    case "json": {
      if (isRecord(value.value) && typeof value.value.message === "string") {
        return {
          isError: false,
          payload: {
            data: value.value.data,
            message: value.value.message,
            nextRoute:
              typeof value.value.nextRoute === "string"
                ? value.value.nextRoute
                : undefined,
          },
        };
      }

      return {
        isError: false,
        payload: {
          data: value.value,
          message: "Tool execution completed.",
        },
      };
    }
    case "error-text":
      return {
        isError: true,
        payload: {
          message: typeof value.value === "string" ? value.value : "Tool failed.",
        },
      };
    case "error-json":
      return {
        isError: true,
        payload: {
          data: value.value,
          message: "Tool failed.",
        },
      };
    default:
      return {
        isError: false,
        payload: {
          message: "Tool execution completed.",
        },
      };
  }
};

const responseMessagesToCoachMessages = (
  responseMessages: Array<{ content: unknown; role: "assistant" | "tool" }>
): CoachConversationMessage[] => {
  const messages: CoachConversationMessage[] = [];

  for (const responseMessage of responseMessages) {
    if (!Array.isArray(responseMessage.content)) {
      if (
        responseMessage.role === "assistant" &&
        typeof responseMessage.content === "string" &&
        responseMessage.content.trim()
      ) {
        messages.push(createCoachAssistantMessage(responseMessage.content.trim()));
      }
      continue;
    }

    if (responseMessage.role === "assistant") {
      const textBuffer: string[] = [];

      const flushTextBuffer = () => {
        const content = textBuffer.join("").trim();
        if (!content) {
          return;
        }

        messages.push(createCoachAssistantMessage(content));
        textBuffer.length = 0;
      };

      for (const part of responseMessage.content) {
        if (!isRecord(part) || typeof part.type !== "string") {
          continue;
        }

        if (part.type === "text" && typeof part.text === "string") {
          textBuffer.push(part.text);
          continue;
        }

        flushTextBuffer();

        if (
          part.type === "tool-call" &&
          typeof part.toolCallId === "string" &&
          typeof part.toolName === "string" &&
          isRecord(part.input) &&
          part.toolName in coachToolExecutionByName
        ) {
          messages.push(
            createCoachToolCallMessage({
              execution:
                coachToolExecutionByName[part.toolName as CoachToolName],
              input: part.input,
              toolCallId: part.toolCallId,
              toolName: part.toolName as CoachToolName,
            })
          );
        }
      }

      flushTextBuffer();
      continue;
    }

    for (const part of responseMessage.content) {
      if (
        !isRecord(part) ||
        part.type !== "tool-result" ||
        typeof part.toolCallId !== "string" ||
        typeof part.toolName !== "string" ||
        !(part.toolName in coachToolExecutionByName)
      ) {
        continue;
      }

      const { isError, payload } = parseToolResultPayload(part.output);
      messages.push(
        createCoachToolResultMessage({
          execution: coachToolExecutionByName[part.toolName as CoachToolName],
          isError,
          output: payload,
          toolCallId: part.toolCallId,
          toolName: part.toolName as CoachToolName,
        })
      );
    }
  }

  return messages;
};

export const runCoachAgentTurn = async ({
  auth,
  env,
  messages,
  model,
  provider,
}: RunCoachAgentTurnParams): Promise<CoachAgentResponse> => {
  try {
    const serverContext = await createCoachServerDataContext(env, auth);
    const tools = createCoachAgentTools(serverContext);
    const agent = new ToolLoopAgent<never, CoachToolSet>({
      id: "stratos-coach",
      instructions: coachAgentInstructions,
      model: createLlmModel({
        localLlmUrl: env.localLlmUrl,
        model,
        openRouterApiKey: env.openRouterApiKey,
        openRouterApiUrl: env.openRouterApiUrl,
        openRouterAppName: env.openRouterAppName,
        openRouterReferer: env.openRouterReferer,
        provider,
      }),
      stopWhen: stepCountIs(6),
      tools,
    });

    const result = await agent.generate({
      messages: coachMessagesToModelMessages(messages),
    });

    const responseMessages = responseMessagesToCoachMessages(
      result.response.messages as Array<{ content: unknown; role: "assistant" | "tool" }>
    );

    if (
      result.finishReason === "tool-calls" &&
      responseMessages.some(
        message => message.kind === "tool_call" && message.execution === "client"
      )
    ) {
      return {
        messages: responseMessages,
        status: "client_tool_required",
      };
    }

    return {
      messages: responseMessages,
      status: "completed",
    };
  } catch (error) {
    console.error("Coach agent runtime failed:", error);
    return createCoachErrorResponse(
      `Sorry, STRATOS Coach hit an error: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    );
  }
};
