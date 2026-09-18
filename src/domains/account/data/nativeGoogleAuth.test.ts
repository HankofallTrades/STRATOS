import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  NATIVE_GOOGLE_REDIRECT_URL,
  completeNativeGoogleSignIn,
  listenForNativeGoogleSignIn,
} from "./nativeGoogleAuth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/integrations/supabase/types";

const capacitorApp = {
  addListener: vi.fn(),
  getLaunchUrl: vi.fn(),
};
const capacitorBrowser = { close: vi.fn(), open: vi.fn() };

vi.mock("@capacitor/app", () => ({ App: capacitorApp }));
vi.mock("@capacitor/browser", () => ({ Browser: capacitorBrowser }));

const authClient = (
  setSession = vi.fn().mockResolvedValue({ error: null })
) => ({
  client: { auth: { setSession } } as unknown as SupabaseClient<Database>,
  setSession,
});

const callback = (fragment: string) =>
  `${NATIVE_GOOGLE_REDIRECT_URL}#${fragment}`;

describe("completeNativeGoogleSignIn", () => {
  it("stores the session carried in the callback fragment", async () => {
    const { client, setSession } = authClient();

    const handled = await completeNativeGoogleSignIn(
      callback("access_token=at&refresh_token=rt&token_type=bearer"),
      client
    );

    expect(handled).toBe(true);
    expect(setSession).toHaveBeenCalledWith({
      access_token: "at",
      refresh_token: "rt",
    });
  });

  // Every other deep link the shell receives must fall through untouched, or
  // an unrelated URL would be treated as a half-finished sign-in.
  it.each([
    ["a foreign scheme", "https://stratos.app/auth/callback#access_token=at"],
    ["another host", "com.daimodus.stratos://share#access_token=at"],
    ["another path", "com.daimodus.stratos://auth/reset#access_token=at"],
    ["an unparseable URL", "not a url"],
  ])("ignores %s", async (_label, url) => {
    const { client, setSession } = authClient();

    await expect(completeNativeGoogleSignIn(url, client)).resolves.toBe(false);
    expect(setSession).not.toHaveBeenCalled();
  });

  it("surfaces an OAuth error from the fragment", async () => {
    const { client, setSession } = authClient();

    await expect(
      completeNativeGoogleSignIn(
        callback("error=access_denied&error_description=User+said+no"),
        client
      )
    ).rejects.toThrow("User said no");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("surfaces an OAuth error delivered as a query string", async () => {
    const { client } = authClient();

    await expect(
      completeNativeGoogleSignIn(
        `${NATIVE_GOOGLE_REDIRECT_URL}?error_description=Provider+is+down`,
        client
      )
    ).rejects.toThrow("Provider is down");
  });

  it("rejects a callback that carries no session", async () => {
    const { client } = authClient();

    await expect(
      completeNativeGoogleSignIn(callback("token_type=bearer"), client)
    ).rejects.toThrow("did not return a session");
  });

  it("propagates a Supabase setSession failure", async () => {
    const { client } = authClient(
      vi.fn().mockResolvedValue({ error: new Error("token expired") })
    );

    await expect(
      completeNativeGoogleSignIn(
        callback("access_token=at&refresh_token=rt"),
        client
      )
    ).rejects.toThrow("token expired");
  });
});

describe("listenForNativeGoogleSignIn", () => {
  const remove = vi.fn();
  let deliver: (payload: { url: string }) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    capacitorApp.addListener.mockImplementation((_event, handler) => {
      deliver = handler;
      return Promise.resolve({ remove });
    });
    capacitorApp.getLaunchUrl.mockResolvedValue(null);
    capacitorBrowser.close.mockResolvedValue(undefined);
  });

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("signs in from a cold-start launch URL", async () => {
    const { client, setSession } = authClient();
    capacitorApp.getLaunchUrl.mockResolvedValue({
      url: callback("access_token=at&refresh_token=rt"),
    });

    await listenForNativeGoogleSignIn(client, vi.fn());
    await flush();

    expect(setSession).toHaveBeenCalledOnce();
  });

  // The cold start delivers the same URL twice: once via getLaunchUrl and again
  // through appUrlOpen. Replaying it would exchange a spent refresh token.
  it("handles a repeated callback URL only once", async () => {
    const { client, setSession } = authClient();
    const url = callback("access_token=at&refresh_token=rt");
    capacitorApp.getLaunchUrl.mockResolvedValue({ url });

    await listenForNativeGoogleSignIn(client, vi.fn());
    await flush();
    deliver({ url });
    await flush();

    expect(setSession).toHaveBeenCalledOnce();
  });

  it("leaves deep links that are not the auth callback alone", async () => {
    const { client, setSession } = authClient();

    await listenForNativeGoogleSignIn(client, vi.fn());
    deliver({ url: "com.daimodus.stratos://share/workout/12" });
    await flush();

    expect(setSession).not.toHaveBeenCalled();
    expect(capacitorBrowser.close).not.toHaveBeenCalled();
  });

  // A rejected sign-in still has to dismiss the OAuth sheet, or the error lands
  // on a screen the user cannot see.
  it("reports a failed callback and still closes the sheet", async () => {
    const { client } = authClient();
    const onError = vi.fn();

    await listenForNativeGoogleSignIn(client, onError);
    deliver({ url: callback("error_description=User+said+no") });
    await flush();

    expect(onError).toHaveBeenCalledWith("User said no");
    expect(capacitorBrowser.close).toHaveBeenCalled();
  });

  it("closes the OAuth sheet after a successful sign-in", async () => {
    const { client } = authClient();

    await listenForNativeGoogleSignIn(client, vi.fn());
    deliver({ url: callback("access_token=at&refresh_token=rt") });
    await flush();

    expect(capacitorBrowser.close).toHaveBeenCalled();
  });

  it("removes the listener when the caller stops listening", async () => {
    const { client } = authClient();

    const stop = await listenForNativeGoogleSignIn(client, vi.fn());
    await stop();

    expect(remove).toHaveBeenCalled();
  });
});
