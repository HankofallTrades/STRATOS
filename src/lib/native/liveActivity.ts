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

export const syncLiveActivity = async (state: LiveActivityState): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await plugin.sync({ state });
  } catch (error) {
    // A refused or unavailable activity must never take the workout with it.
    console.warn("live activity: could not sync", error);
  }
};

export const endLiveActivity = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await plugin.end();
  } catch (error) {
    console.warn("live activity: could not end", error);
  }
};
