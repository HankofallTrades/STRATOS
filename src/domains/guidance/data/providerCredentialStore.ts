import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import type { Database } from "../../../lib/integrations/supabase/types.js";
import type { HostedCredentialProvider } from "./providerCredentialContracts.js";

export interface ProviderCredentialStoreEnvironment {
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  supabaseUrl?: string;
  userSecretEncryptionKey?: string;
}

type EnvironmentSource = Record<string, string | undefined>;

interface StoredCredentialRow {
  encrypted_api_key: string;
  encryption_iv: string;
  encryption_tag: string;
  key_last_four: string;
}

const ENCRYPTION_KEY_VERSION = 1;

export const resolveProviderCredentialEnvironment = (
  envSource: EnvironmentSource
): ProviderCredentialStoreEnvironment => ({
  supabaseAnonKey:
    envSource.SUPABASE_ANON_KEY || envSource.VITE_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: envSource.SUPABASE_SERVICE_ROLE_KEY,
  supabaseUrl: envSource.SUPABASE_URL || envSource.VITE_SUPABASE_URL,
  userSecretEncryptionKey: envSource.USER_SECRET_ENCRYPTION_KEY,
});

const createAuthClient = (
  env: ProviderCredentialStoreEnvironment,
  accessToken: string
): SupabaseClient<Database> => {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase auth environment variables are not configured.");
  }

  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

const createAdminClient = (
  env: ProviderCredentialStoreEnvironment
): SupabaseClient<Database> => {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase service-role environment variables are not configured."
    );
  }

  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const requireAuthenticatedUser = async (
  env: ProviderCredentialStoreEnvironment,
  accessToken?: string | null
): Promise<User> => {
  if (!accessToken) {
    throw new Error("You must be logged in to manage Coach credentials.");
  }

  const authClient = createAuthClient(env, accessToken);
  const { data, error } = await authClient.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error("Your session is invalid. Please sign in again.");
  }

  return data.user;
};

const getEncryptionKey = (secret: string) =>
  createHash("sha256").update(secret).digest();

const encryptApiKey = (apiKey: string, secret: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(secret), iv);
  const encryptedApiKey = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted_api_key: encryptedApiKey.toString("base64"),
    encryption_iv: iv.toString("base64"),
    encryption_tag: authTag.toString("base64"),
    key_last_four: apiKey.slice(-4),
  };
};

const decryptApiKey = (row: StoredCredentialRow, secret: string) => {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(secret),
    Buffer.from(row.encryption_iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(row.encryption_tag, "base64"));

  const decryptedApiKey = Buffer.concat([
    decipher.update(Buffer.from(row.encrypted_api_key, "base64")),
    decipher.final(),
  ]);

  return decryptedApiKey.toString("utf8");
};

export const getStoredProviderCredentialStatus = async ({
  accessToken,
  env,
  provider,
}: {
  accessToken?: string | null;
  env: ProviderCredentialStoreEnvironment;
  provider: HostedCredentialProvider;
}) => {
  const user = await requireAuthenticatedUser(env, accessToken);
  const adminClient = createAdminClient(env);
  const { data, error } = await adminClient
    .from("user_provider_credentials")
    .select("key_last_four")
    .eq("provider", provider)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load stored credential: ${error.message}`);
  }

  return {
    hasStoredCredential: Boolean(data?.key_last_four),
    last4: data?.key_last_four ?? null,
    provider,
  };
};

export const upsertStoredProviderCredential = async ({
  accessToken,
  apiKey,
  env,
  provider,
}: {
  accessToken?: string | null;
  apiKey: string;
  env: ProviderCredentialStoreEnvironment;
  provider: HostedCredentialProvider;
}) => {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    throw new Error("Enter an API key before saving.");
  }

  if (!env.userSecretEncryptionKey) {
    throw new Error(
      "USER_SECRET_ENCRYPTION_KEY is not configured on the server."
    );
  }

  const user = await requireAuthenticatedUser(env, accessToken);
  const encryptedCredential = encryptApiKey(
    trimmedApiKey,
    env.userSecretEncryptionKey
  );
  const adminClient = createAdminClient(env);
  const { error } = await adminClient.from("user_provider_credentials").upsert(
    {
      ...encryptedCredential,
      key_version: ENCRYPTION_KEY_VERSION,
      provider,
      user_id: user.id,
    },
    {
      onConflict: "user_id,provider",
    }
  );

  if (error) {
    throw new Error(`Failed to save credential: ${error.message}`);
  }

  return {
    hasStoredCredential: true,
    last4: encryptedCredential.key_last_four,
    provider,
  };
};

export const deleteStoredProviderCredential = async ({
  accessToken,
  env,
  provider,
}: {
  accessToken?: string | null;
  env: ProviderCredentialStoreEnvironment;
  provider: HostedCredentialProvider;
}) => {
  const user = await requireAuthenticatedUser(env, accessToken);
  const adminClient = createAdminClient(env);
  const { error } = await adminClient
    .from("user_provider_credentials")
    .delete()
    .eq("provider", provider)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to delete credential: ${error.message}`);
  }

  return {
    hasStoredCredential: false,
    last4: null,
    provider,
  };
};

export const loadStoredProviderCredentialForUser = async ({
  env,
  provider,
  userId,
}: {
  env: ProviderCredentialStoreEnvironment;
  provider: HostedCredentialProvider;
  userId: string;
}): Promise<string | null> => {
  if (!env.userSecretEncryptionKey) {
    throw new Error(
      "USER_SECRET_ENCRYPTION_KEY is not configured on the server."
    );
  }

  const adminClient = createAdminClient(env);
  const { data, error } = await adminClient
    .from("user_provider_credentials")
    .select("encrypted_api_key, encryption_iv, encryption_tag, key_last_four")
    .eq("provider", provider)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load credential for Coach: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return decryptApiKey(data as StoredCredentialRow, env.userSecretEncryptionKey);
};
