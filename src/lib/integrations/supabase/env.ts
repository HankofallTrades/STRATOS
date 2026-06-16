interface SupabaseBrowserEnv {
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
}

export interface SupabaseBrowserConfig {
  anonKey: string;
  url: string;
}

export const readSupabaseBrowserConfig = (
  env: SupabaseBrowserEnv
): SupabaseBrowserConfig | null => {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return {
    anonKey,
    url,
  };
};
