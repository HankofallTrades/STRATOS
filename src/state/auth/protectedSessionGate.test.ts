import { describe, expect, it, vi } from "vitest";

import { resolveProtectedSession } from "@/state/auth/protectedSessionGate";

describe("resolveProtectedSession", () => {
  it("treats missing Supabase config as unauthenticated", async () => {
    const loadClient = vi.fn().mockResolvedValue(null);

    await expect(resolveProtectedSession(loadClient)).resolves.toEqual({
      status: "unauthenticated",
    });
    expect(loadClient).toHaveBeenCalledTimes(1);
  });

  it("returns authenticated when a session is already stored", async () => {
    const session = { access_token: "token" };
    const getSession = vi.fn().mockResolvedValue({
      data: { session },
    });
    const loadClient = vi.fn().mockResolvedValue({
      auth: { getSession },
    });

    await expect(resolveProtectedSession(loadClient)).resolves.toEqual({
      session,
      status: "authenticated",
    });
  });
});
