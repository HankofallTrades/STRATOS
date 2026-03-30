import { z } from "zod";

export const hostedCredentialProviders = [
  "anthropic",
  "google",
  "openai",
  "openrouter",
] as const;

export type HostedCredentialProvider = (typeof hostedCredentialProviders)[number];

export const hostedCredentialProviderSchema = z.enum(hostedCredentialProviders);

export const providerCredentialStatusSchema = z.object({
  hasStoredCredential: z.boolean(),
  last4: z.string().nullable(),
  provider: hostedCredentialProviderSchema,
});

export type ProviderCredentialStatus = z.infer<
  typeof providerCredentialStatusSchema
>;

export const upsertProviderCredentialRequestSchema = z.object({
  apiKey: z.string().trim().min(1),
  provider: hostedCredentialProviderSchema,
});

export const deleteProviderCredentialRequestSchema = z.object({
  provider: hostedCredentialProviderSchema,
});
