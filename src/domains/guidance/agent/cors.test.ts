import { describe, expect, it } from "vitest";

import {
  CAPACITOR_IOS_ORIGIN,
  parseAllowedCoachOrigins,
  resolveCoachCorsHeaders,
} from "./cors";

describe("parseAllowedCoachOrigins", () => {
  it("always allows the wrap's own origin, so a bare deployment can serve iOS", () => {
    expect(parseAllowedCoachOrigins(undefined)).toContain(CAPACITOR_IOS_ORIGIN);
  });

  it("adds configured origins without dropping the built-in one", () => {
    expect(parseAllowedCoachOrigins("http://localhost:8080")).toEqual([
      CAPACITOR_IOS_ORIGIN,
      "http://localhost:8080",
    ]);
  });

  it("ignores blank entries so a trailing comma cannot allow the empty origin", () => {
    expect(parseAllowedCoachOrigins("http://localhost:8080, ,")).toEqual([
      CAPACITOR_IOS_ORIGIN,
      "http://localhost:8080",
    ]);
  });
});

describe("resolveCoachCorsHeaders", () => {
  const allowedOrigins = parseAllowedCoachOrigins(undefined);

  it("grants the wrap's origin, echoed back rather than wildcarded", () => {
    const headers = resolveCoachCorsHeaders({
      allowedOrigins,
      origin: CAPACITOR_IOS_ORIGIN,
    });

    expect(headers["Access-Control-Allow-Origin"]).toBe(CAPACITOR_IOS_ORIGIN);
    expect(headers["Access-Control-Allow-Methods"]).toBe("POST, OPTIONS");
  });

  // The body carries a Supabase access token and a BYOK provider key. A
  // wildcard here would let any page replay a Coach turn, so an unknown origin
  // must come back with no grant at all.
  it("grants nothing to an unknown origin", () => {
    const headers = resolveCoachCorsHeaders({
      allowedOrigins,
      origin: "https://evil.example",
    });

    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("never answers with a wildcard, whoever is asking", () => {
    for (const origin of [CAPACITOR_IOS_ORIGIN, "https://evil.example"]) {
      const headers = resolveCoachCorsHeaders({ allowedOrigins, origin });
      expect(headers["Access-Control-Allow-Origin"]).not.toBe("*");
    }
  });

  it("leaves a same-origin request (no Origin header) ungranted and untouched", () => {
    expect(resolveCoachCorsHeaders({ allowedOrigins, origin: undefined })).toEqual(
      { Vary: "Origin" }
    );
  });

  // Without Vary, a CDN may serve the response cached for one origin — grant
  // header included — to another.
  it("varies on Origin even when it grants nothing", () => {
    expect(
      resolveCoachCorsHeaders({ allowedOrigins, origin: "https://evil.example" })
        .Vary
    ).toBe("Origin");
  });
});
