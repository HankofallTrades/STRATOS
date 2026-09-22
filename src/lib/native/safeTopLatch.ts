import { Capacitor } from "@capacitor/core";

// Holds `--app-safe-top` at the last top inset the webview honestly reported.
//
// WebKit stops reporting the inset for the rest of the session once the login
// keyboard has been raised: `env(safe-area-inset-top)` drops to `0px` while the
// webview stays full height, which puts the home greeting back under the clock
// until the app is relaunched (docs/ios.md). In portrait a zero is therefore
// never the truth, and the last real reading stands. In landscape it is the
// truth — the status bar is gone there — so landscape is taken at face value.
//
// The property is what gets overridden; `env()` itself is left alone, so the
// probe keeps reading whatever the webview currently thinks. A no-op on the
// web, where the inset is zero anyway and nothing drops it.

export type Orientation = "portrait" | "landscape";

export interface SafeTopSample {
  orientation: Orientation;
  /** What `env(safe-area-inset-top)` resolves to right now, in px. */
  top: number;
}

/**
 * `null` means nothing trustworthy has been measured yet: leave the CSS value
 * in place rather than pinning it to a zero the device never meant.
 */
export type SafeTop = number | null;

export const createSafeTopLatch = () => {
  let latched: SafeTop = null;

  return ({ orientation, top }: SafeTopSample): SafeTop => {
    const measured = Number.isFinite(top) && top > 0 ? top : 0;

    if (orientation === "landscape") return measured;
    // A non-zero reading is always current, including a smaller one: the inset
    // grows for an in-call bar and shrinks back when the call ends.
    if (measured > 0) latched = measured;
    return latched;
  };
};

const PROBE_STYLE =
  "position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);" +
  "visibility:hidden;pointer-events:none";

/** Aspect, which is what the CSS orientation media feature means by it too. */
const orientationOf = (): Orientation =>
  window.innerHeight >= window.innerWidth ? "portrait" : "landscape";

export const startSafeTopLatch = (): void => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.setAttribute("style", PROBE_STYLE);
    document.body.append(probe);

    const latch = createSafeTopLatch();
    const sample = () => {
      const top = latch({
        orientation: orientationOf(),
        top: probe.getBoundingClientRect().height,
      });
      const root = document.documentElement.style;
      if (top === null) root.removeProperty("--app-safe-top");
      else root.setProperty("--app-safe-top", `${top}px`);
    };

    // The first paint can land before the webview has its insets, so sample
    // again once a frame has gone by rather than trusting the boot reading.
    sample();
    requestAnimationFrame(sample);
    // Rotating changes the real inset; coming back from the background is when
    // a stale zero turns up. Both land here.
    window.addEventListener("resize", sample);
    window.addEventListener("orientationchange", sample);
    document.addEventListener("visibilitychange", sample);
  } catch (error) {
    // This runs before render: a throw here would blank the app over a padding
    // detail.
    console.warn("safe area: could not latch the top inset", error);
  }
};
