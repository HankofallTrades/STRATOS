import { describe, expect, it } from "vitest";

import { statusBarStyleForBackground } from "./statusBarStyle";
import { cyberpunkTheme, fantasyTheme, modernTheme } from "./themes";

describe("statusBarStyleForBackground", () => {
  it("wants light text over a dark background", () => {
    expect(statusBarStyleForBackground("215 25% 8%")).toBe("light-text");
  });

  it("wants dark text over a light background", () => {
    expect(statusBarStyleForBackground("0 0% 100%")).toBe("dark-text");
  });

  it("falls back to light text when the value is not an HSL triple", () => {
    expect(statusBarStyleForBackground("#ffffff")).toBe("light-text");
  });

  // The shipped themes are the real inputs. If one is added or its background
  // changes, this is where an unreadable clock would show up first.
  it("picks the legible style for every shipped theme", () => {
    expect(statusBarStyleForBackground(fantasyTheme.colors.background)).toBe("light-text");
    expect(statusBarStyleForBackground(cyberpunkTheme.colors.background)).toBe("light-text");
    expect(statusBarStyleForBackground(modernTheme.colors.background)).toBe("dark-text");
  });
});
