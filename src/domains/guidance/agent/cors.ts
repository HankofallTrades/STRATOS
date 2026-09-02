/**
 * The iOS wrap calls the Coach function cross-origin, so the function has to
 * name the origins it accepts. It is an allowlist rather than `*` on purpose:
 * the request body carries the caller's Supabase access token, and a wildcard
 * would let any page on the internet spend a user's BYOK key by replaying one.
 */
export const CAPACITOR_IOS_ORIGIN = "capacitor://localhost";

export const DEFAULT_ALLOWED_COACH_ORIGINS: readonly string[] = [
  CAPACITOR_IOS_ORIGIN,
];

/**
 * Extra origins for deployments that need them (a branch preview driving a
 * local wrap, say). Comma-separated, server-side only.
 */
export const parseAllowedCoachOrigins = (
  rawValue: string | undefined
): readonly string[] => {
  const extras = (rawValue ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ALLOWED_COACH_ORIGINS, ...extras])];
};

interface CoachCorsParams {
  allowedOrigins: readonly string[];
  origin: string | undefined;
}

export const resolveCoachCorsHeaders = ({
  allowedOrigins,
  origin,
}: CoachCorsParams): Record<string, string> => {
  // Always vary, even on a rejection: without it a CDN can hand one origin's
  // cached response, headers and all, to a different origin.
  const headers: Record<string, string> = { Vary: "Origin" };

  if (!origin || !allowedOrigins.includes(origin)) {
    return headers;
  }

  return {
    ...headers,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
};
