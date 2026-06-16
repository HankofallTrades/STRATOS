import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/integrations/supabase/types";
import { readSupabaseBrowserConfig } from "@/lib/integrations/supabase/env";

export type BrowserSupabaseClient = SupabaseClient<Database>;
export type SupabaseCreateClient = (
  url: string,
  anonKey: string
) => BrowserSupabaseClient;

type SupabaseModule = {
  createClient: SupabaseCreateClient;
};

type SupabaseImporter = () => Promise<SupabaseModule>;

const importSupabaseModule: SupabaseImporter = () =>
  import("@supabase/supabase-js");

export const supabaseBrowserConfig = readSupabaseBrowserConfig(import.meta.env);
export const hasSupabaseBrowserConfig = supabaseBrowserConfig !== null;

export const createSupabaseBrowserClientLoader = (
  config = supabaseBrowserConfig,
  importer: SupabaseImporter = importSupabaseModule
) => {
  let clientPromise: Promise<BrowserSupabaseClient> | null = null;

  return async (): Promise<BrowserSupabaseClient | null> => {
    if (!config) {
      return null;
    }

    if (!clientPromise) {
      clientPromise = importer().then(({ createClient }) =>
        createClient(config.url, config.anonKey)
      );
    }

    return clientPromise;
  };
};

export const loadSupabaseBrowserClient = createSupabaseBrowserClientLoader();
