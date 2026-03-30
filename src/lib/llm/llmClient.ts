import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type LlmProvider =
  | "anthropic"
  | "google"
  | "local"
  | "openai"
  | "openrouter";

export interface LlmModelConfig {
  apiKey?: string;
  localLlmUrl?: string;
  model?: string;
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
  apiKey,
  localLlmUrl,
  model,
  openRouterApiUrl,
  openRouterAppName,
  openRouterReferer,
  provider,
}: LlmModelConfig): LanguageModel => {
  switch (provider) {
    case "anthropic": {
      if (!apiKey) {
        throw new Error(
          "An Anthropic API key is required. Add your own key in Settings before using Coach."
        );
      }

      if (!model) {
        throw new Error("An Anthropic model is required for the coach agent.");
      }

      return createAnthropic({
        apiKey,
      })(model);
    }
    case "google": {
      if (!apiKey) {
        throw new Error(
          "A Google AI API key is required. Add your own key in Settings before using Coach."
        );
      }

      if (!model) {
        throw new Error("A Google model is required for the coach agent.");
      }

      return createGoogleGenerativeAI({
        apiKey,
      })(model);
    }
    case "openai": {
      if (!apiKey) {
        throw new Error(
          "An OpenAI API key is required. Add your own key in Settings before using Coach."
        );
      }

      if (!model) {
        throw new Error("An OpenAI model is required for the coach agent.");
      }

      return createOpenAI({
        apiKey,
      })(model);
    }
    case "openrouter": {
      if (!apiKey) {
        throw new Error(
          "An OpenRouter API key is required. Add your own key in Settings before using Coach."
        );
      }

      if (!model) {
        throw new Error("An OpenRouter model is required for the coach agent.");
      }

      return createOpenAICompatible({
        apiKey,
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
