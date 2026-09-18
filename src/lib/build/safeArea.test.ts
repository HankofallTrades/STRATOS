import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import capacitorConfig from "../../../capacitor.config";

const repoRoot = path.resolve(__dirname, "../../..");
const read = (relativePath: string) =>
  readFileSync(path.join(repoRoot, relativePath), "utf8");

/**
 * I-25: in the wrap the status bar overlays the webview, so top-of-screen
 * content has to reserve the inset itself. Three things have to agree for that
 * to work, and each one silently no-ops the other two if it goes missing.
 */
describe("iOS safe-area contract", () => {
  it("opts the viewport into the display cutout, so env(safe-area-inset-*) is non-zero", () => {
    const viewport = read("index.html").match(
      /<meta name="viewport" content="([^"]+)"/
    );

    expect(viewport?.[1]).toContain("viewport-fit=cover");
  });

  it("leaves the inset to CSS rather than letting Capacitor adjust it too", () => {
    expect(capacitorConfig.ios?.contentInset).toBe("never");
  });

  it("defines the inset once, so the surfaces that reserve it agree on a value", () => {
    expect(read("src/index.css")).toContain(
      "--app-safe-top: env(safe-area-inset-top, 0px);"
    );
  });

  it("reserves the top inset on every app page, at both padding breakpoints", () => {
    const css = read("src/index.css");
    const appPageRules = [...css.matchAll(/\.app-page \{([^}]*)\}/g)].map(
      (match) => match[1]
    );
    const rulesWithTopPadding = appPageRules.filter((rule) =>
      /padding(-top)?:/.test(rule)
    );

    expect(rulesWithTopPadding.length).toBeGreaterThan(0);
    for (const rule of rulesWithTopPadding) {
      expect(rule).toContain("var(--app-safe-top)");
    }
  });

  /**
   * These screens render their own full-height shell instead of `.app-page`,
   * so nothing reserves the status bar for them. Under `contentInset: "never"`
   * a bare `pt-*` here puts the header under the clock.
   */
  it("reserves it on the shells that render outside .app-page", () => {
    const shells = [
      "src/domains/fitness/ui/WorkoutScreen.tsx",
      "src/domains/account/ui/AuthForm.tsx",
      "src/components/loading/RouteSkeletons.tsx",
    ];

    for (const shell of shells) {
      expect(read(shell)).toContain("var(--app-safe-top)");
    }
  });
});
