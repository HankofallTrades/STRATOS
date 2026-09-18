import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/integrations/supabase/types";

export const NATIVE_GOOGLE_REDIRECT_URL =
  "com.daimodus.stratos://auth/callback";

type AuthClient = SupabaseClient<Database>;

// One source of truth for the scheme: the `Info.plist` CFBundleURLSchemes entry
// and the Supabase redirect allowlist both have to match this string exactly.
const callbackUrl = new URL(NATIVE_GOOGLE_REDIRECT_URL);

const isGoogleCallback = (url: URL) =>
  url.protocol === callbackUrl.protocol &&
  url.hostname === callbackUrl.hostname &&
  url.pathname === callbackUrl.pathname;

export const completeNativeGoogleSignIn = async (
  callbackUrl: string,
  supabase: AuthClient,
): Promise<boolean> => {
  let url: URL;
  try {
    url = new URL(callbackUrl);
  } catch {
    return false;
  }

  if (!isGoogleCallback(url)) return false;

  // The browser client is created without options, so auth-js runs its default
  // implicit flow and hands the session back in the fragment. Switching that
  // client to `flowType: "pkce"` would put a `code` in the query string instead
  // and break every callback below.
  const params = new URLSearchParams(url.hash.slice(1));
  const errorDescription =
    params.get("error_description") ??
    url.searchParams.get("error_description") ??
    params.get("error") ??
    url.searchParams.get("error");
  if (errorDescription) throw new Error(errorDescription);

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) {
    throw new Error("Google sign-in did not return a session.");
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;

  return true;
};

export const startNativeGoogleSignIn = async (supabase: AuthClient) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: NATIVE_GOOGLE_REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Google sign-in did not return a URL.");

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url });
};

export const listenForNativeGoogleSignIn = async (
  supabase: AuthClient,
  onError: (message: string) => void,
) => {
  const { App } = await import("@capacitor/app");
  const { Browser } = await import("@capacitor/browser");
  let lastCallbackUrl: string | null = null;

  const handleUrl = async (url: string) => {
    // A cold start delivers the same URL through both getLaunchUrl and the
    // listener; replaying it would trade a live session for a spent one.
    if (url === lastCallbackUrl) return;

    try {
      if (!(await completeNativeGoogleSignIn(url, supabase))) return;
    } catch (error) {
      onError(error instanceof Error ? error.message : "Google sign-in failed.");
    }
    lastCallbackUrl = url;

    // A cold-start callback has no browser sheet left to close.
    try {
      await Browser.close();
    } catch {
      // The callback has already returned to the native shell.
    }
  };

  const listener = await App.addListener("appUrlOpen", ({ url }) => {
    void handleUrl(url);
  });
  const launch = await App.getLaunchUrl();
  if (launch?.url) void handleUrl(launch.url);

  return () => listener.remove();
};
