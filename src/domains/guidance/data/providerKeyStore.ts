const KEY_PREFIX = "providerApiKey";

export const readProviderApiKey = (provider: string): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`${KEY_PREFIX}:${provider}`) ?? null;
};

export const writeProviderApiKey = (provider: string, key: string): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${KEY_PREFIX}:${provider}`, key);
};

export const clearProviderApiKey = (provider: string): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${KEY_PREFIX}:${provider}`);
};
