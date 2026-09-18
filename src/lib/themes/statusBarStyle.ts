// Which way the native status bar text should go for a theme background. The
// themes store colours as shadcn-style "H S% L%" triples; the lightness is all
// that matters for whether a white clock is readable.

export type StatusBarTextStyle = "light-text" | "dark-text";

const LIGHT_BACKGROUND_MIN_LIGHTNESS = 50;

export const statusBarStyleForBackground = (
  backgroundHsl: string
): StatusBarTextStyle => {
  const match = backgroundHsl.trim().match(/^\S+\s+\S+\s+([\d.]+)%$/);
  if (!match) return "light-text";
  const lightness = Number(match[1]);
  return lightness >= LIGHT_BACKGROUND_MIN_LIGHTNESS ? "dark-text" : "light-text";
};
