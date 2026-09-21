import { Capacitor, registerPlugin } from "@capacitor/core";

import type { LiveActivityState } from "@/domains/fitness/data/liveActivityState";

// Thin bridge over the StratosLiveActivity plugin. What the lock screen should
// say is decided in the fitness domain (buildLiveActivityState); this only
// carries it across. There is no start/update split here on purpose: whether an
// activity exists yet is native state, so the native side answers it. A no-op
// on the web, where the widget extension does not exist.

export interface LiveActivityPlugin {
  sync(options: { state: LiveActivityState }): Promise<void>;
  end(): Promise<void>;
}

const plugin = registerPlugin<LiveActivityPlugin>("StratosLiveActivity");

/**
 * Whether the call failed because the plugin is not on the bridge, rather than
 * because the phone said no.
 *
 * Capacitor answers a call it cannot route with these codes, and a wrap build
 * that does not register the plugin fails this way on every call — the lock
 * screen is simply dead. It cannot be gated on a dev build, because the wrap is
 * always built in production mode, so the only thing separating a wiring
 * mistake from a refused activity is the code.
 */
const isUnroutable = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "UNIMPLEMENTED" || code === "UNAVAILABLE";
};

/**
 * Reports a failed bridge call without ever taking the workout with it.
 *
 * A refused activity is the phone's business and stays a warning. An unroutable
 * one is the app's own wiring, so it is an error: warning through it once cost
 * a build cycle spent chasing ActivityKit for a plugin that was never
 * registered.
 */
export const reportLiveActivityFailure = (operation: string, error: unknown): void => {
  if (isUnroutable(error)) {
    console.error(
      `live activity: the StratosLiveActivity plugin is not on the bridge, so ${operation} did nothing. Registered in ViewController.capacitorDidLoad — see docs/ios.md.`,
      error
    );
    return;
  }

  console.warn(`live activity: could not ${operation}`, error);
};

export const syncLiveActivity = async (state: LiveActivityState): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await plugin.sync({ state });
  } catch (error) {
    reportLiveActivityFailure("sync", error);
  }
};

export const endLiveActivity = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await plugin.end();
  } catch (error) {
    reportLiveActivityFailure("end", error);
  }
};
