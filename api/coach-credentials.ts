import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  deleteProviderCredentialRequestSchema,
  hostedCredentialProviderSchema,
  upsertProviderCredentialRequestSchema,
} from "../src/domains/guidance/data/providerCredentialContracts.js";
import {
  deleteStoredProviderCredential,
  getStoredProviderCredentialStatus,
  resolveProviderCredentialEnvironment,
  upsertStoredProviderCredential,
} from "../src/domains/guidance/data/providerCredentialStore.js";
import { loadLocalEnv } from "../src/lib/server/loadLocalEnv.js";

loadLocalEnv();

const providerCredentialEnvironment = resolveProviderCredentialEnvironment(
  process.env
);

const getAccessToken = (req: VercelRequest) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim() || null;
};

const readProviderFromQuery = (req: VercelRequest) => {
  const provider = Array.isArray(req.query.provider)
    ? req.query.provider[0]
    : req.query.provider;

  return hostedCredentialProviderSchema.parse(provider);
};

const resolveErrorStatus = (error: unknown) => {
  if (!(error instanceof Error)) {
    return 500;
  }

  if (
    error.message.includes("logged in") ||
    error.message.includes("session is invalid")
  ) {
    return 401;
  }

  if (error.message.includes("not configured")) {
    return 500;
  }

  return 400;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const accessToken = getAccessToken(req);

    if (req.method === "GET") {
      const provider = readProviderFromQuery(req);
      const result = await getStoredProviderCredentialStatus({
        accessToken,
        env: providerCredentialEnvironment,
        provider,
      });

      return res.status(200).json(result);
    }

    if (req.method === "PUT") {
      const { apiKey, provider } = upsertProviderCredentialRequestSchema.parse(
        req.body
      );

      const result = await upsertStoredProviderCredential({
        accessToken,
        apiKey,
        env: providerCredentialEnvironment,
        provider,
      });

      return res.status(200).json(result);
    }

    if (req.method === "DELETE") {
      const { provider } = deleteProviderCredentialRequestSchema.parse(req.body);
      const result = await deleteStoredProviderCredential({
        accessToken,
        env: providerCredentialEnvironment,
        provider,
      });

      return res.status(200).json(result);
    }

    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An internal server error occurred.";
    return res.status(resolveErrorStatus(error)).json({
      error: message,
    });
  }
}
