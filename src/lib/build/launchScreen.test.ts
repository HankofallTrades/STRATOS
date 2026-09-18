import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import capacitorConfig from "../../../capacitor.config";

const repoRoot = path.resolve(__dirname, "../../..");
const read = (relativePath: string) =>
  readFileSync(path.join(repoRoot, relativePath), "utf8");
const md5 = (relativePath: string) =>
  createHash("md5").update(readFileSync(path.join(repoRoot, relativePath))).digest("hex");

// Capacitor's own placeholder artwork: a blue cross on white. `cap add ios`
// ships these, and nothing in the build complains if they are still there.
const STOCK_CAPACITOR_ICON_MD5 = "0ac741c9e1701ee14dd05ea131f7cfd8";
const STOCK_CAPACITOR_SPLASH_MD5 = "958532b95c3e7d4997327dc977b80600";

/**
 * I-16: the app is dark, so a cold start has to be dark from the first frame.
 * Three things have to agree, and each one on its own produces a white flash
 * or a stranger's logo.
 */
describe("iOS launch screen contract", () => {
  it("paints the launch storyboard black rather than the system background", () => {
    const storyboard = read("ios/App/App/Base.lproj/LaunchScreen.storyboard");

    expect(storyboard).not.toContain("systemBackgroundColor");
    expect(storyboard).toMatch(
      /<color key="backgroundColor" red="0\.0" green="0\.0" blue="0\.0" alpha="1"/
    );
  });

  it("keeps the webview background black for the frame between launch and first paint", () => {
    expect(capacitorConfig.ios?.backgroundColor).toBe("#000000");
  });

  it("does not ship Capacitor's placeholder launch image", () => {
    for (const name of [
      "splash-2732x2732.png",
      "splash-2732x2732-1.png",
      "splash-2732x2732-2.png",
    ]) {
      expect(md5(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`)).not.toBe(
        STOCK_CAPACITOR_SPLASH_MD5
      );
    }
  });

  it("does not ship Capacitor's placeholder app icon", () => {
    expect(md5("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")).not.toBe(
      STOCK_CAPACITOR_ICON_MD5
    );
  });
});
