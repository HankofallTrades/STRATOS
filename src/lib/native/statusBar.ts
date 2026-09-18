import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

import type { StatusBarTextStyle } from "@/lib/themes/statusBarStyle";

// Thin bridge over the Status Bar plugin: sets the clock's text colour to
// whatever statusBarStyleForBackground decided. The bar stays an overlay; the
// app reserves the space itself (docs/ios.md, "The status bar overlays the
// webview"). A no-op on the web.

export const applyStatusBarTextStyle = async (
  textStyle: StatusBarTextStyle
): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // The plugin names styles after the background: Style.Dark is light text.
    await StatusBar.setStyle({
      style: textStyle === "light-text" ? Style.Dark : Style.Light,
    });
  } catch (error) {
    console.warn("status bar: could not set style", error);
  }
};
