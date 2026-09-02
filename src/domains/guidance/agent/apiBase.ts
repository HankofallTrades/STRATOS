/**
 * The web target is served from the same origin as its serverless functions, so
 * a relative path is correct there and must stay relative — an absolute URL
 * would turn every Coach turn into a needless cross-origin request.
 *
 * The iOS wrap has no such luxury. It serves the bundle from
 * `capacitor://localhost`, where a relative `/api/coach` resolves to the app's
 * own scheme and never reaches Vercel at all. Native builds supply an absolute
 * base (see `vite.config.ts`).
 */
export const COACH_API_PATH = "/api/coach";

interface CoachApiEnv {
  VITE_COACH_API_BASE_URL?: string;
}

export const resolveCoachApiUrl = (env: CoachApiEnv): string => {
  const base = env.VITE_COACH_API_BASE_URL?.trim();
  if (!base) {
    return COACH_API_PATH;
  }

  return `${base.replace(/\/+$/, "")}${COACH_API_PATH}`;
};
