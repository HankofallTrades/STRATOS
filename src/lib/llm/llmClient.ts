import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type LlmProvider = "local" | "openrouter";

export interface LlmModelConfig {
  localLlmUrl?: string;
  model?: string;
  openRouterApiKey?: string;
  openRouterApiUrl: string;
  openRouterAppName: string;
  openRouterReferer: string;
  provider: LlmProvider;
}

const trimProviderBaseUrl = (url: string) => {
  const normalizedUrl = url.trim().replace(/\/+$/, "");

  if (normalizedUrl.endsWith("/chat/completions")) {
    return normalizedUrl.slice(0, -"/chat/completions".length);
  }

  return normalizedUrl;
};

export const createLlmModel = ({
  localLlmUrl,
  model,
  openRouterApiKey,
  openRouterApiUrl,
  openRouterAppName,
  openRouterReferer,
  provider,
}: LlmModelConfig): LanguageModel => {
  switch (provider) {
    case "openrouter": {
      if (!openRouterApiKey) {
        throw new Error("OPENROUTER_API_KEY environment variable is not set.");
      }

      if (!model) {
        throw new Error("An OpenRouter model is required for the coach agent.");
      }

      return createOpenAICompatible({
        apiKey: openRouterApiKey,
        baseURL: trimProviderBaseUrl(openRouterApiUrl),
        headers: {
          "HTTP-Referer": openRouterReferer,
          "X-Title": openRouterAppName,
        },
        name: "openrouter",
      }).chatModel(model);
    }
    case "local": {
      if (!localLlmUrl) {
        throw new Error(
          "LOCAL_LLM_URL (or VITE_LOCAL_LLM_URL) environment variable is not set."
        );
      }

      return createOpenAICompatible({
        baseURL: trimProviderBaseUrl(localLlmUrl),
        name: "local",
      }).chatModel(model || "local-model");
    }
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
};
