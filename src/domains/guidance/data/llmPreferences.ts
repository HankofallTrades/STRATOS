export type LlmProviderPreference =
  | "anthropic"
  | "google"
  | "local"
  | "openai"
  | "openrouter";

export interface LlmModelOption {
  label: string;
  value: string;
}

export interface LlmProviderOption {
  apiKeyLabel?: string;
  apiKeyPlaceholder?: string;
  defaultModel: string;
  description: string;
  label: string;
  models: readonly LlmModelOption[];
  requiresApiKey: boolean;
  value: LlmProviderPreference;
}

export const llmProviderOptions = [
  {
    defaultModel: "",
    description: "Use your own local OpenAI-compatible runtime.",
    label: "Local (LM Studio/Ollama)",
    models: [],
    requiresApiKey: false,
    value: "local",
  },
  {
    apiKeyLabel: "OpenRouter API Key",
    apiKeyPlaceholder: "sk-or-v1-...",
    defaultModel: "openrouter/auto",
    description: "Use your own OpenRouter account and route across current frontier models.",
    label: "OpenRouter",
    models: [
      { value: "openrouter/auto", label: "Auto Router" },
      { value: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
      { value: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
    ],
    requiresApiKey: true,
    value: "openrouter",
  },
  {
    apiKeyLabel: "OpenAI API Key",
    apiKeyPlaceholder: "sk-...",
    defaultModel: "gpt-5.4-mini",
    description: "Call OpenAI directly with your own API key.",
    label: "OpenAI",
    models: [
      { value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
      { value: "gpt-5.4", label: "GPT-5.4" },
      { value: "gpt-5.4-pro", label: "GPT-5.4 Pro" },
      { value: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
    ],
    requiresApiKey: true,
    value: "openai",
  },
  {
    apiKeyLabel: "Anthropic API Key",
    apiKeyPlaceholder: "sk-ant-...",
    defaultModel: "claude-sonnet-4-20250514",
    description: "Call Anthropic directly with your own API key.",
    label: "Anthropic",
    models: [
      { value: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
    ],
    requiresApiKey: true,
    value: "anthropic",
  },
  {
    apiKeyLabel: "Google AI API Key",
    apiKeyPlaceholder: "AIza...",
    defaultModel: "gemini-2.5-flash",
    description: "Call Google Generative AI directly with your own API key.",
    label: "Google",
    models: [
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
    ],
    requiresApiKey: true,
    value: "google",
  },
] as const satisfies readonly LlmProviderOption[];

type HostedLlmProviderPreference = Exclude<LlmProviderPreference, "local">;

export interface LlmPreferenceState {
  model: string;
  provider: LlmProviderPreference;
}

export const LLM_PROVIDER_PREF_KEY = "llmProviderPref";
export const LLM_MODEL_PREFS_KEY = "llmModelPrefs";

type StoredModelPreferenceMap = Partial<Record<HostedLlmProviderPreference, string>>;

const llmProviderOptionByValue = Object.fromEntries(
  llmProviderOptions.map(option => [option.value, option])
) as Record<LlmProviderPreference, LlmProviderOption>;

const isLlmProviderPreference = (
  value: string | null | undefined
): value is LlmProviderPreference => {
  return typeof value === "string" && value in llmProviderOptionByValue;
};

const getLocalStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const readStorageJson = <T>(
  storage: Storage | null,
  key: string
): T => {
  if (!storage) {
    return {} as T;
  }

  const rawValue = storage.getItem(key);
  if (!rawValue) {
    return {} as T;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    if (typeof parsedValue === "object" && parsedValue !== null) {
      return parsedValue as T;
    }
  } catch (error) {
    console.error(`Failed to parse stored JSON for ${key}:`, error);
  }

  return {} as T;
};

const writeStorageJson = (
  storage: Storage | null,
  key: string,
  value: Record<string, string | undefined>
) => {
  if (!storage) {
    return;
  }

  const normalizedValue = Object.fromEntries(
    Object.entries(value).filter(
      entry => typeof entry[1] === "string" && entry[1].length > 0
    )
  );

  if (Object.keys(normalizedValue).length === 0) {
    storage.removeItem(key);
    return;
  }

  storage.setItem(key, JSON.stringify(normalizedValue));
};

const readStoredModelPreferences = (): StoredModelPreferenceMap =>
  readStorageJson<StoredModelPreferenceMap>(getLocalStorage(), LLM_MODEL_PREFS_KEY);

export const getLlmProviderOption = (
  provider: LlmProviderPreference
): LlmProviderOption => llmProviderOptionByValue[provider];

export const getLlmModelOptions = (
  provider: LlmProviderPreference
): readonly LlmModelOption[] => getLlmProviderOption(provider).models;

export const providerRequiresApiKey = (
  provider: LlmProviderPreference
): boolean => getLlmProviderOption(provider).requiresApiKey;

export const getDefaultModelForProvider = (
  provider: LlmProviderPreference
): string => getLlmProviderOption(provider).defaultModel;

export const getDefaultLlmProvider = (): LlmProviderPreference => {
  const runtimeProvider = import.meta.env.VITE_LLM_PROVIDER;
  if (isLlmProviderPreference(runtimeProvider)) {
    return runtimeProvider;
  }

  return import.meta.env.DEV ? "local" : "openrouter";
};

export const readLlmProviderPreference = (): LlmProviderPreference => {
  const savedProvider = getLocalStorage()?.getItem(LLM_PROVIDER_PREF_KEY);
  return isLlmProviderPreference(savedProvider)
    ? savedProvider
    : getDefaultLlmProvider();
};

export const resolveStoredModelForProvider = (
  provider: LlmProviderPreference
): string => {
  if (provider === "local") {
    return "";
  }

  const storedModelPreferences = readStoredModelPreferences();
  return storedModelPreferences[provider] || getDefaultModelForProvider(provider);
};

export const readLlmPreferences = (): LlmPreferenceState => {
  const provider = readLlmProviderPreference();

  return {
    model: resolveStoredModelForProvider(provider),
    provider,
  };
};

export const writeLlmProviderPreference = (
  provider: LlmProviderPreference
): void => {
  getLocalStorage()?.setItem(LLM_PROVIDER_PREF_KEY, provider);
};

export const writeLlmModelPreference = (
  provider: LlmProviderPreference,
  model: string
): void => {
  if (provider === "local") {
    return;
  }

  const storedModelPreferences = readStoredModelPreferences();
  const nextModelPreferences = { ...storedModelPreferences };

  if (model) {
    nextModelPreferences[provider] = model;
  } else {
    delete nextModelPreferences[provider];
  }

  writeStorageJson(getLocalStorage(), LLM_MODEL_PREFS_KEY, nextModelPreferences);
};

export const persistLlmPreferences = ({
  model,
  provider,
}: LlmPreferenceState): void => {
  writeLlmProviderPreference(provider);
  writeLlmModelPreference(provider, model);
};

export const buildMissingProviderConfigurationMessage = (
  provider: LlmProviderPreference
): string | null => {
  if (!providerRequiresApiKey(provider)) {
    return null;
  }

  return "Add an API key in Settings to use Coach.";
};
