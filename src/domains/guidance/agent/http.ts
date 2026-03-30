import {
  coachAgentRequestSchema,
  createCoachErrorResponse,
  type CoachAgentRequest,
  type CoachAgentResponse,
} from "./contracts.js";
import {
  resolveProviderCredentialEnvironment,
} from "../data/providerCredentialStore.js";
import {
  runCoachAgentTurn,
  type CoachAgentRuntimeEnvironment,
} from "./runtime.js";

interface HandleCoachAgentRequestParams {
  body: unknown;
  env: CoachAgentRuntimeEnvironment;
}

export interface CoachAgentHttpResult {
  body:
    | CoachAgentResponse
    | {
        details?: unknown;
        error: string;
      };
  status: number;
}

type EnvironmentSource = Record<string, string | undefined>;

export const resolveCoachAgentEnvironment = (
  envSource: EnvironmentSource
): CoachAgentRuntimeEnvironment => ({
  localLlmUrl: envSource.LOCAL_LLM_URL || envSource.VITE_LOCAL_LLM_URL,
  openRouterApiUrl:
    envSource.OPENROUTER_API_URL ||
    envSource.VITE_OPENROUTER_API_URL ||
    "https://openrouter.ai/api/v1/chat/completions",
  openRouterAppName: envSource.VITE_APP_NAME || envSource.APP_NAME || "STRATOS",
  openRouterReferer:
    envSource.VITE_APP_URL || envSource.APP_URL || "http://localhost:5173",
  ...resolveProviderCredentialEnvironment(envSource),
});

export const handleCoachAgentRequest = async ({
  body,
  env,
}: HandleCoachAgentRequestParams): Promise<CoachAgentHttpResult> => {
  try {
    const parsedRequest = coachAgentRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      return {
        body: {
          details: parsedRequest.error.flatten(),
          error: "Invalid request body for coach agent.",
        },
        status: 400,
      };
    }

    const request: CoachAgentRequest = parsedRequest.data;
    const agentResponse = await runCoachAgentTurn({
      auth: request.auth,
      env,
      messages: request.messages,
      model: request.model,
      provider: request.provider,
    });

    return {
      body: agentResponse,
      status: 200,
    };
  } catch (error) {
    console.error("Error in coach agent request handler:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An internal server error occurred";

    return {
      body: createCoachErrorResponse(
        `Sorry, STRATOS Coach could not respond: ${errorMessage}.`
      ),
      status: 200,
    };
  }
};
