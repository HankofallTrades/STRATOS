export type LlmProviderPreference = "local" | "openrouter";

export interface LlmPreferenceState {
  provider: LlmProviderPreference;
  model: string;
}

export const LLM_PROVIDER_PREF_KEY = "llmProviderPref";
export const LLM_MODEL_PREF_KEY = "llmModelPref";
export const DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-chat-v3-0324:free";

export const OPENROUTER_MODEL_OPTIONS = [
  { value: "deepseek/deepseek-chat-v3-0324:free", label: "Deepseek V3" },
  { value: "google/gemini-2.5-pro-exp-03-25", label: "Gemini 2.5 Pro Exp." },
  { value: "deepseek/deepseek-r1:free", label: "Deepseek R1" },
  { value: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash Exp." },
] as const;

const isLlmProviderPreference = (
  value: string | null | undefined
): value is LlmProviderPreference => {
  return value === "local" || value === "openrouter";
};

export const getDefaultLlmProvider = (): LlmProviderPreference => {
  const runtimeProvider = import.meta.env.VITE_LLM_PROVIDER;
  return isLlmProviderPreference(runtimeProvider) ? runtimeProvider : "local";
};

export const readLlmProviderPreference = (): LlmProviderPreference => {
  const savedProvider = localStorage.getItem(LLM_PROVIDER_PREF_KEY);
  return isLlmProviderPreference(savedProvider)
    ? savedProvider
    : getDefaultLlmProvider();
};

export const resolveStoredModelForProvider = (
  provider: LlmProviderPreference
): string => {
  if (provider !== "openrouter") {
    return "";
  }

  return localStorage.getItem(LLM_MODEL_PREF_KEY) || DEFAULT_OPENROUTER_MODEL;
};

export const readLlmPreferences = (): LlmPreferenceState => {
  const provider = readLlmProviderPreference();

  return {
    provider,
    model: resolveStoredModelForProvider(provider),
  };
};

export const writeLlmProviderPreference = (
  provider: LlmProviderPreference
): void => {
  localStorage.setItem(LLM_PROVIDER_PREF_KEY, provider);
};

export const writeLlmModelPreference = (
  provider: LlmProviderPreference,
  model: string
): void => {
  if (provider !== "openrouter") {
    return;
  }

  if (model) {
    localStorage.setItem(LLM_MODEL_PREF_KEY, model);
    return;
  }

  localStorage.removeItem(LLM_MODEL_PREF_KEY);
};

export const persistLlmPreferences = ({
  provider,
  model,
}: LlmPreferenceState): void => {
  writeLlmProviderPreference(provider);
  writeLlmModelPreference(provider, model);
};
