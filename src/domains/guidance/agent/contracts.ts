import { z } from "zod";

export const coachToolNames = [
  "generate_strength_workout",
  "get_user_profile_summary",
  "get_recent_workout_summary",
] as const;

export type CoachToolName = (typeof coachToolNames)[number];
export type CoachToolExecutionEnvironment = "client" | "server";

export interface CoachToolResultPayload {
  message: string;
  data?: unknown;
  nextRoute?: string;
}

export interface CoachUserMessage {
  id: string;
  kind: "user";
  content: string;
}

export interface CoachAssistantMessage {
  id: string;
  kind: "assistant";
  content: string;
}

export interface CoachToolCallMessage {
  id: string;
  kind: "tool_call";
  toolCallId: string;
  toolName: CoachToolName;
  execution: CoachToolExecutionEnvironment;
  input: Record<string, unknown>;
}

export interface CoachToolResultMessage {
  id: string;
  kind: "tool_result";
  toolCallId: string;
  toolName: CoachToolName;
  execution: CoachToolExecutionEnvironment;
  output: CoachToolResultPayload;
  isError?: boolean;
}

export interface CoachErrorMessage {
  id: string;
  kind: "error";
  content: string;
}

export type CoachConversationMessage =
  | CoachUserMessage
  | CoachAssistantMessage
  | CoachToolCallMessage
  | CoachToolResultMessage
  | CoachErrorMessage;

export interface CoachAgentAuthContext {
  supabaseAccessToken?: string | null;
}

export type CoachAgentResponseStatus =
  | "completed"
  | "client_tool_required"
  | "error";

const coachLlmProviders = [
  "anthropic",
  "google",
  "local",
  "openai",
  "openrouter",
] as const;

export type CoachLlmProvider = (typeof coachLlmProviders)[number];

export interface CoachAgentRequest {
  messages: CoachConversationMessage[];
  provider: CoachLlmProvider;
  model?: string;
  auth?: CoachAgentAuthContext;
}

export interface CoachAgentResponse {
  status: CoachAgentResponseStatus;
  messages: CoachConversationMessage[];
}

const coachToolNameSchema = z.enum(coachToolNames);
const coachToolExecutionSchema = z.enum(["client", "server"]);

const coachToolResultPayloadSchema = z.object({
  data: z.unknown().optional(),
  message: z.string(),
  nextRoute: z.string().optional(),
});

const coachUserMessageSchema = z.object({
  content: z.string(),
  id: z.string(),
  kind: z.literal("user"),
});

const coachAssistantMessageSchema = z.object({
  content: z.string(),
  id: z.string(),
  kind: z.literal("assistant"),
});

const coachToolCallMessageSchema = z.object({
  execution: coachToolExecutionSchema,
  id: z.string(),
  input: z.record(z.string(), z.unknown()),
  kind: z.literal("tool_call"),
  toolCallId: z.string(),
  toolName: coachToolNameSchema,
});

const coachToolResultMessageSchema = z.object({
  execution: coachToolExecutionSchema,
  id: z.string(),
  isError: z.boolean().optional(),
  kind: z.literal("tool_result"),
  output: coachToolResultPayloadSchema,
  toolCallId: z.string(),
  toolName: coachToolNameSchema,
});

const coachErrorMessageSchema = z.object({
  content: z.string(),
  id: z.string(),
  kind: z.literal("error"),
});

export const coachConversationMessageSchema = z.discriminatedUnion("kind", [
  coachUserMessageSchema,
  coachAssistantMessageSchema,
  coachToolCallMessageSchema,
  coachToolResultMessageSchema,
  coachErrorMessageSchema,
]);

export const coachAgentRequestSchema = z.object({
  auth: z
    .object({
      supabaseAccessToken: z.string().min(1).nullable().optional(),
    })
    .optional(),
  messages: z.array(coachConversationMessageSchema),
  model: z.string().optional(),
  provider: z.enum(coachLlmProviders),
});

export const coachAgentResponseSchema = z.object({
  messages: z.array(coachConversationMessageSchema),
  status: z.enum(["completed", "client_tool_required", "error"]),
});

const createCoachMessageId = () => {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) {
    return randomUuid;
  }

  return `coach-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createCoachUserMessage = (content: string): CoachUserMessage => ({
  content,
  id: createCoachMessageId(),
  kind: "user",
});

export const createCoachAssistantMessage = (
  content: string
): CoachAssistantMessage => ({
  content,
  id: createCoachMessageId(),
  kind: "assistant",
});

export const createCoachToolCallMessage = ({
  execution,
  input,
  toolCallId,
  toolName,
}: Omit<CoachToolCallMessage, "id" | "kind">): CoachToolCallMessage => ({
  execution,
  id: createCoachMessageId(),
  input,
  kind: "tool_call",
  toolCallId,
  toolName,
});

export const createCoachToolResultMessage = ({
  execution,
  isError,
  output,
  toolCallId,
  toolName,
}: Omit<CoachToolResultMessage, "id" | "kind">): CoachToolResultMessage => ({
  execution,
  id: createCoachMessageId(),
  ...(isError ? { isError } : {}),
  kind: "tool_result",
  output,
  toolCallId,
  toolName,
});

export const createCoachErrorMessage = (content: string): CoachErrorMessage => ({
  content,
  id: createCoachMessageId(),
  kind: "error",
});

export const createCoachErrorResponse = (
  content: string
): CoachAgentResponse => ({
  messages: [createCoachErrorMessage(content)],
  status: "error",
});

export const isCoachToolCallMessage = (
  message: CoachConversationMessage
): message is CoachToolCallMessage => message.kind === "tool_call";

export const isClientCoachToolCallMessage = (
  message: CoachConversationMessage
): message is CoachToolCallMessage =>
  isCoachToolCallMessage(message) && message.execution === "client";
