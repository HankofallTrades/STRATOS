import { describe, expect, it, vi } from "vitest";

import {
  resolveProtectedSession,
  shouldResolveProtectedSession,
} from "@/state/auth/protectedSessionGate";

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

describe("shouldResolveProtectedSession", () => {
  it("resolves while the gate is still checking", () => {
    expect(shouldResolveProtectedSession("checking")).toBe(true);
  });

  // The regression this guards: the gate used to re-resolve on every
  // navigation, which returned it to "checking" and unmounted
  // ProtectedAppShell. Everything the shell owns went with it — the Coach
  // conversation, and the refs useProactiveEngine compares against to spot a
  // transition, so finishing a workout never looked like a change and the
  // workout_finished insight never fired (I-23).
  it("never re-resolves once authenticated, so the shell is never unmounted", () => {
    expect(shouldResolveProtectedSession("authenticated")).toBe(false);
  });

  // Bouncing to /login unmounts this component anyway; re-resolving here would
  // only loop.
  it("does not re-resolve once unauthenticated", () => {
    expect(shouldResolveProtectedSession("unauthenticated")).toBe(false);
  });
});
