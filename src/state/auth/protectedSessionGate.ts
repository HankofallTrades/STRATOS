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
 * never again on navigation: this is keyed on gate state, deliberately not on
 * location.pathname. Re-resolving sets the gate back to "checking", which
 * renders a placeholder instead of ProtectedAppShell and so unmounts every
 * piece of shell-level state below it — the Coach conversation, and the refs
 * useProactiveEngine compares against to spot a transition like a workout
 * finishing.
 *
 * The hazard is timing-dependent and does not reproduce on web. When
 * getSession() resolves within a microtask (warm client, cached session) React
 * batches the "checking" and "authenticated" updates into one render and the
 * placeholder never commits. Measured on both the pre-fix and post-fix builds
 * by holding a DOM node the shell owns and checking it stays attached across
 * navigation and across a workout finish: attached in every case, and the
 * workout_finished insight fired on the pre-fix build too.
 *
 * So this guardrail was NOT the cause of I-23, which remains open and looks
 * wrap-specific. Do not cite it as that fix.
 *
 * It is still worth keeping: whenever the resolve is slower than a microtask —
 * a cold client, a slow network, the dynamic import not yet cached — the
 * placeholder does commit and the shell does remount. Keeping a session valid
 * over time is AuthProvider's job anyway: it subscribes to onAuthStateChange,
 * and ProtectedRoute redirects when the session goes away, which catches expiry
 * immediately rather than on the next navigation.
 */
export const shouldResolveProtectedSession = (
  state: ProtectedGateState
): boolean => state === "checking";
