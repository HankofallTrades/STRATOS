import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/integrations/supabase/types";
import {
  readSupabaseBrowserConfig,
  type SupabaseBrowserConfig,
} from "@/lib/integrations/supabase/env";

export type BrowserSupabaseClient = SupabaseClient<Database>;
export type SupabaseCreateClient = (
  url: string,
  anonKey: string
) => BrowserSupabaseClient;

type SupabaseModule = {
  createClient: SupabaseCreateClient;
};

type SupabaseImporter = () => Promise<SupabaseModule>;
type SupabaseBrowserClientCache = {
  client: BrowserSupabaseClient | null;
  clientPromise: Promise<BrowserSupabaseClient> | null;
};

const importSupabaseModule: SupabaseImporter = () =>
  import("@supabase/supabase-js");

export const supabaseBrowserConfig = readSupabaseBrowserConfig(import.meta.env);
export const hasSupabaseBrowserConfig = supabaseBrowserConfig !== null;

export const createSupabaseBrowserClientCache =
  (): SupabaseBrowserClientCache => ({
    client: null,
    clientPromise: null,
  });

const defaultBrowserClientCache = createSupabaseBrowserClientCache();

export const getOrCreateSupabaseBrowserClient = (
  config: SupabaseBrowserConfig | null,
  createClient: SupabaseCreateClient,
  cache = defaultBrowserClientCache
): BrowserSupabaseClient | null => {
  if (!config) {
    return null;
  }

  if (!cache.client) {
    cache.client = createClient(config.url, config.anonKey);
    cache.clientPromise = Promise.resolve(cache.client);
  }

  return cache.client;
};

export const createSupabaseBrowserClientLoader = (
  config = supabaseBrowserConfig,
  importer: SupabaseImporter = importSupabaseModule,
  cache = defaultBrowserClientCache
) => {
  return async (): Promise<BrowserSupabaseClient | null> => {
    if (!config) {
      return null;
    }

    if (cache.client) {
      return cache.client;
    }

    if (!cache.clientPromise) {
      cache.clientPromise = importer().then(({ createClient }) => {
        const client = cache.client ?? createClient(config.url, config.anonKey);
        cache.client = client;
        return client;
      });
    }

    return cache.clientPromise;
  };
};

export const loadSupabaseBrowserClient = createSupabaseBrowserClientLoader();
