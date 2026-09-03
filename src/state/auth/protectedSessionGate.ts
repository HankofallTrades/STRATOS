import type { Session } from "@supabase/supabase-js";

import {
  loadSupabaseBrowserClient,
  type BrowserSupabaseClient,
} from "@/lib/integrations/supabase/browserClient";

export type ProtectedSessionState =
  | { status: "authenticated"; session: Session }
  | { status: "unauthenticated" };

type LoadBrowserClient = () => Promise<BrowserSupabaseClient | null>;

export const resolveProtectedSession = async (
  loadClient: LoadBrowserClient = loadSupabaseBrowserClient
): Promise<ProtectedSessionState> => {
  const supabase = await loadClient();

  if (!supabase) {
    return { status: "unauthenticated" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { status: "unauthenticated" };
  }

  return {
    session,
    status: "authenticated",
  };
};

export type ProtectedGateState =
  | "checking"
  | "authenticated"
  | "unauthenticated";

/**
 * The entry gate resolves the session once per entry into the protected tree,
 * never again on navigation. Re-resolving would return the gate to "checking",
 * which unmounts ProtectedAppShell and every piece of shell-level state it
 * owns. Keeping a session valid over time is AuthProvider's job, not this
 * gate's.
 */
export const shouldResolveProtectedSession = (
  state: ProtectedGateState
): boolean => state === "checking";
