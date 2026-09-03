import { describe, expect, it, vi } from "vitest";

import {
  attemptDevAutoLogin,
  readDevAutoLoginCredentials,
} from "@/lib/dev/devAutoLogin";

describe("readDevAutoLoginCredentials", () => {
  it("reads both halves when the env file is filled in", () => {
    expect(
      readDevAutoLoginCredentials({
        VITE_DEV_LOGIN_EMAIL: "test@example.com",
        VITE_DEV_LOGIN_PASSWORD: "secret",
      })
    ).toEqual({ email: "test@example.com", password: "secret" });
  });

  // A fresh clone has no .env.development.local at all. Auto sign-in has to be
  // absent rather than broken there, or it becomes a setup step for everyone
  // instead of a convenience for one machine.
  it("stays inert when nothing is configured", () => {
    expect(readDevAutoLoginCredentials({})).toBeNull();
  });

  // Half-filled is a typo. Acting on it would attempt a doomed sign-in and
  // strand the developer on the login screen with no explanation.
  it("refuses a half-filled config rather than guessing", () => {
    expect(
      readDevAutoLoginCredentials({ VITE_DEV_LOGIN_EMAIL: "test@example.com" })
    ).toBeNull();
    expect(
      readDevAutoLoginCredentials({ VITE_DEV_LOGIN_PASSWORD: "secret" })
    ).toBeNull();
  });

  it("treats whitespace-only values as unset", () => {
    expect(
      readDevAutoLoginCredentials({
        VITE_DEV_LOGIN_EMAIL: "   ",
        VITE_DEV_LOGIN_PASSWORD: "secret",
      })
    ).toBeNull();
  });
});

describe("attemptDevAutoLogin", () => {
  it("signs in and returns the session", async () => {
    const session = { access_token: "token" };
    const signInWithPassword = vi
      .fn()
      .mockResolvedValue({ data: { session }, error: null });

    await expect(
      attemptDevAutoLogin(
        { auth: { signInWithPassword } } as never,
        {
          VITE_DEV_LOGIN_EMAIL: "test@example.com",
          VITE_DEV_LOGIN_PASSWORD: "secret",
        }
      )
    ).resolves.toBe(session);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "secret",
    });
  });

  // Never call out to Supabase when there is nothing configured: an
  // unconfigured checkout must not pay a network round-trip on every gate.
  it("does not touch the client when no credentials are configured", async () => {
    const signInWithPassword = vi.fn();

    await expect(
      attemptDevAutoLogin({ auth: { signInWithPassword } } as never, {})
    ).resolves.toBeNull();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  // A stale password in a dev env file must degrade to the normal login screen.
  // Throwing here would take down the whole protected tree over a convenience.
  it("returns null when Supabase rejects the credentials", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });

    await expect(
      attemptDevAutoLogin({ auth: { signInWithPassword } } as never, {
        VITE_DEV_LOGIN_EMAIL: "test@example.com",
        VITE_DEV_LOGIN_PASSWORD: "wrong",
      })
    ).resolves.toBeNull();
  });

  it("returns null when the client throws", async () => {
    const signInWithPassword = vi
      .fn()
      .mockRejectedValue(new Error("network down"));

    await expect(
      attemptDevAutoLogin({ auth: { signInWithPassword } } as never, {
        VITE_DEV_LOGIN_EMAIL: "test@example.com",
        VITE_DEV_LOGIN_PASSWORD: "secret",
      })
    ).resolves.toBeNull();
  });
});
