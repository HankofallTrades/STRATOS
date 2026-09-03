import type { Session } from "@supabase/supabase-js";

/**
 * Dev-only auto sign-in for the local dev server.
 *
 * Verifying a change in the running app means being signed in, and typing a
 * password by hand every time is the slowest part of that loop — and something
 * an agent cannot do for you at all. This closes that gap the same way
 * `scripts/ios-smoke.sh` does for the simulator: credentials live in a
 * gitignored env file and the machine does the typing.
 *
 * Three things keep this out of a shipped build:
 *
 *  1. The only caller guards on `import.meta.env.DEV` and reaches this module
 *     through a dynamic `import()`, so a production build drops the branch and
 *     never emits the chunk.
 *  2. The credentials are read from `.env.development.local`, which Vite loads
 *     in development mode only. A production build has nothing to inline.
 *  3. Missing or partial credentials return null rather than throwing, so a
 *     fresh clone with no env file behaves exactly as it does today.
 *
 * Use the dedicated test account from `.env.e2e.example`, never a real user:
 * anything an agent does while signed in lands in that account's data.
 */

export type DevLoginCredentials = {
  email: string;
  password: string;
};

type EnvLike = Record<string, unknown>;

type PasswordSignInClient = {
  auth: {
    signInWithPassword: (credentials: DevLoginCredentials) => Promise<{
      data: { session: Session | null };
      error: { message: string } | null;
    }>;
  };
};

const readTrimmed = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * Both halves or nothing. A half-filled env file is a typo, not a request to
 * sign in, and guessing at it would strand the caller on a login screen with no
 * explanation.
 */
export const readDevAutoLoginCredentials = (
  env: EnvLike
): DevLoginCredentials | null => {
  const email = readTrimmed(env.VITE_DEV_LOGIN_EMAIL);
  const password = readTrimmed(env.VITE_DEV_LOGIN_PASSWORD);

  if (!email || !password) {
    return null;
  }

  return { email, password };
};

/**
 * Returns the session on success, null on any failure. Failure here must stay
 * soft: this is a convenience, and a wrong password in a dev env file should
 * drop you at the normal login screen rather than break the app.
 */
export const attemptDevAutoLogin = async (
  supabase: PasswordSignInClient,
  env: EnvLike
): Promise<Session | null> => {
  const credentials = readDevAutoLoginCredentials(env);

  if (!credentials) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);

    if (error) {
      console.warn(
        `[dev] auto sign-in failed for ${credentials.email}: ${error.message}`
      );
      return null;
    }

    return data.session ?? null;
  } catch (error) {
    console.warn("[dev] auto sign-in threw", error);
    return null;
  }
};
