import type { Session } from "@supabase/supabase-js";

import {
  loadSupabaseBrowserClient,
  type BrowserSupabaseClient,
} from "@/lib/integrations/supabase/browserClient";

export type ProtectedSessionState =
  | { status: "authenticated"; session: Session }
  | { status: "unauthenticated" };

type LoadBrowserClient = () => Promise<BrowserSupabaseClient | null>;
type RecoverSession = (
  supabase: BrowserSupabaseClient
) => Promise<Session | null>;

/**
 * Dev-only auto sign-in, reached through a dynamic import behind a static
 * `import.meta.env.DEV` check so a production build eliminates the branch and
 * never emits the chunk. See `@/lib/dev/devAutoLogin`.
 */
const recoverDevSession: RecoverSession = async supabase => {
  if (!import.meta.env.DEV) {
    return null;
  }

  const { attemptDevAutoLogin } = await import("@/lib/dev/devAutoLogin");
  return attemptDevAutoLogin(supabase, import.meta.env);
};

export const resolveProtectedSession = async (
  loadClient: LoadBrowserClient = loadSupabaseBrowserClient,
  recoverSession: RecoverSession = recoverDevSession
): Promise<ProtectedSessionState> => {
  const supabase = await loadClient();

  if (!supabase) {
    return { status: "unauthenticated" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const recovered = await recoverSession(supabase);

    if (recovered) {
      return { session: recovered, status: "authenticated" };
    }

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
