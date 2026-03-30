import {
  deleteProviderCredentialRequestSchema,
  providerCredentialStatusSchema,
  upsertProviderCredentialRequestSchema,
  type HostedCredentialProvider,
  type ProviderCredentialStatus,
} from "@/domains/guidance/data/providerCredentialContracts";

interface ProviderCredentialRequestBase {
  accessToken: string;
  provider: HostedCredentialProvider;
}

interface UpsertProviderCredentialParams extends ProviderCredentialRequestBase {
  apiKey: string;
}

const buildAuthHeaders = (accessToken: string): HeadersInit => {
  if (!accessToken) {
    throw new Error("You must be logged in to manage Coach credentials.");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
};

const parseErrorResponse = async (response: Response) => {
  const payload = await response.json().catch(() => ({}));
  throw new Error(
    (payload as { error?: string }).error ||
      `Request failed with status ${response.status}`
  );
};

export const fetchProviderCredentialStatus = async ({
  accessToken,
  provider,
}: ProviderCredentialRequestBase): Promise<ProviderCredentialStatus> => {
  const response = await fetch(
    `/api/coach-credentials?provider=${encodeURIComponent(provider)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
    }
  );

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  const payload: unknown = await response.json();
  return providerCredentialStatusSchema.parse(payload);
};

export const upsertProviderCredential = async ({
  accessToken,
  apiKey,
  provider,
}: UpsertProviderCredentialParams): Promise<ProviderCredentialStatus> => {
  const requestBody = upsertProviderCredentialRequestSchema.parse({
    apiKey,
    provider,
  });
  const response = await fetch("/api/coach-credentials", {
    body: JSON.stringify(requestBody),
    headers: buildAuthHeaders(accessToken),
    method: "PUT",
  });

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  const payload: unknown = await response.json();
  return providerCredentialStatusSchema.parse(payload);
};

export const deleteProviderCredential = async ({
  accessToken,
  provider,
}: ProviderCredentialRequestBase): Promise<ProviderCredentialStatus> => {
  const requestBody = deleteProviderCredentialRequestSchema.parse({
    provider,
  });
  const response = await fetch("/api/coach-credentials", {
    body: JSON.stringify(requestBody),
    headers: buildAuthHeaders(accessToken),
    method: "DELETE",
  });

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  const payload: unknown = await response.json();
  return providerCredentialStatusSchema.parse(payload);
};
