import type { LlmProviderPreference } from "@/domains/guidance/data/llmPreferences";
import {
  coachAgentResponseSchema,
  type CoachAgentAuthContext,
  type CoachAgentResponse,
  type CoachConversationMessage,
} from "@/domains/guidance/agent/contracts";

interface SendCoachMessageRequest {
  auth?: CoachAgentAuthContext;
  messages: CoachConversationMessage[];
  provider: LlmProviderPreference;
  model?: string;
}

export const sendCoachMessage = async ({
  auth,
  messages,
  provider,
  model,
}: SendCoachMessageRequest): Promise<CoachAgentResponse> => {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth,
      messages,
      provider,
      model,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `API request failed with status ${response.status}`
    );
  }

  const payload: unknown = await response.json();
  return coachAgentResponseSchema.parse(payload) as CoachAgentResponse;
};
