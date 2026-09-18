import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// Thin bridge over the Haptics plugin. Which pattern a set deserves is decided
// in the fitness domain (setCompletionFeedback); this only plays it. A no-op
// on the web, where the plugin would otherwise fall back to navigator.vibrate.

export type SetCompletionHaptic = "set" | "pr";

export const playSetCompletionHaptic = async (
  kind: SetCompletionHaptic
): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (kind === "pr") {
      // The success pattern is a distinct double tap, heavier than an impact.
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  } catch (error) {
    console.warn("haptics: could not play feedback", error);
  }
};
