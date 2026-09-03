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

describe("resolveProtectedSession dev recovery", () => {
  const clientWithoutSession = () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  });

  // The dev auto sign-in exists so a local dev server comes up authenticated
  // without anyone typing a password. When it recovers a session the gate must
  // report authenticated, or the convenience buys nothing.
  it("reports authenticated when dev recovery returns a session", async () => {
    const session = { access_token: "recovered" };
    const loadClient = vi.fn().mockResolvedValue(clientWithoutSession());

    await expect(
      resolveProtectedSession(loadClient, async () => session as never)
    ).resolves.toEqual({ session, status: "authenticated" });
  });

  // A production build passes a recovery that always declines. Nothing about
  // the unauthenticated path may change there.
  it("stays unauthenticated when recovery declines", async () => {
    const loadClient = vi.fn().mockResolvedValue(clientWithoutSession());

    await expect(
      resolveProtectedSession(loadClient, async () => null)
    ).resolves.toEqual({ status: "unauthenticated" });
  });

  // A stored session is the normal path and must never trigger a sign-in.
  it("does not attempt recovery when a session is already stored", async () => {
    const session = { access_token: "token" };
    const loadClient = vi.fn().mockResolvedValue({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session } }) },
    });
    const recover = vi.fn();

    await expect(resolveProtectedSession(loadClient, recover)).resolves.toEqual({
      session,
      status: "authenticated",
    });
    expect(recover).not.toHaveBeenCalled();
  });
});
