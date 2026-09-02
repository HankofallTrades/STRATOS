import { describe, expect, it } from "vitest";

import { resolveCoachApiUrl } from "./apiBase";

describe("resolveCoachApiUrl", () => {
  // The web target is same-origin with its own functions. If this ever returned
  // an absolute URL, every web Coach turn would become a cross-origin request
  // that the function would then have to be opened up to accept.
  it("stays relative when no base is configured, so the web target is same-origin", () => {
    expect(resolveCoachApiUrl({})).toBe("/api/coach");
  });

  it("treats a blank base as no base rather than building '/api/coach' onto nothing", () => {
    expect(resolveCoachApiUrl({ VITE_COACH_API_BASE_URL: "   " })).toBe(
      "/api/coach"
    );
  });

  // Under capacitor://localhost a relative path resolves to the app's own
  // scheme and never leaves the device, so the native build must get an
  // absolute origin.
  it("builds an absolute URL when a base is configured, so the wrap can leave its own scheme", () => {
    expect(
      resolveCoachApiUrl({
        VITE_COACH_API_BASE_URL: "https://stratos-theta.vercel.app",
      })
    ).toBe("https://stratos-theta.vercel.app/api/coach");
  });

  it("does not double the separator when the base carries a trailing slash", () => {
    expect(
      resolveCoachApiUrl({
        VITE_COACH_API_BASE_URL: "https://stratos-theta.vercel.app//",
      })
    ).toBe("https://stratos-theta.vercel.app/api/coach");
  });
});
