import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";

// Refcounted wrap over the Keep Awake plugin. Surfaces that need the screen on
// (an active workout, a running breathwork session) each hold it under their
// own name; the plugin is only called on the first hold and the last release,
// so a breathwork run inside a workout cannot let the screen sleep when it
// ends. Nothing here decides *when* to hold: the hook does that from state.

export interface KeepAwakePlugin {
  keepAwake(): Promise<void>;
  allowSleep(): Promise<void>;
}

export interface KeepAwakeController {
  acquire(holder: string): Promise<void>;
  release(holder: string): Promise<void>;
}

export const createKeepAwakeController = (
  plugin: KeepAwakePlugin
): KeepAwakeController => {
  const holders = new Set<string>();
  let held = false;
  // Plugin calls run one at a time, in order. A release that lands while an
  // acquire is still awaiting the plugin would otherwise see `held` false,
  // skip allowSleep, and leave the screen on with nobody holding it.
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (step: () => Promise<void>): Promise<void> => {
    queue = queue.then(step, step);
    return queue;
  };

  return {
    acquire(holder) {
      return enqueue(async () => {
        if (holders.has(holder)) return;
        holders.add(holder);
        if (held) return;
        try {
          await plugin.keepAwake();
          held = true;
        } catch (error) {
          console.warn("keep-awake: could not hold the screen", error);
        }
      });
    },
    release(holder) {
      return enqueue(async () => {
        if (!holders.delete(holder)) return;
        if (holders.size > 0 || !held) return;
        held = false;
        try {
          await plugin.allowSleep();
        } catch (error) {
          console.warn("keep-awake: could not release the screen", error);
        }
      });
    },
  };
};

const noop: KeepAwakePlugin = {
  keepAwake: async () => undefined,
  allowSleep: async () => undefined,
};

/**
 * The app's one controller. On the web the plugin falls back to the Wake Lock
 * API, which the PWA never asked for; keep the web target as it was.
 */
export const keepAwakeController: KeepAwakeController = createKeepAwakeController(
  Capacitor.isNativePlatform() ? KeepAwake : noop
);
