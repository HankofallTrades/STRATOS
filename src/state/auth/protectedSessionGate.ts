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
