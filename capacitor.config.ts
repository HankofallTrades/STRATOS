import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Web assets are bundled into the binary (`webDir`) rather than loaded from the
 * live Vercel URL. ADR-0001: offline behaviour mid-workout matters more than
 * instant-update convenience, so there is deliberately no `server.url` here.
 *
 * Build the assets with `npm run build:ios`, not `npm run build` — the native
 * target drops the service worker, which has nothing to cache when the whole
 * bundle already ships inside the app.
 */
const config: CapacitorConfig = {
  appId: "com.daimodus.stratos",
  appName: "STRATOS",
  webDir: "dist",
  ios: {
    // The app is dark-only, so a white flash between the launch screen and the
    // first paint reads as a bug.
    backgroundColor: "#000000",
  },
};

export default config;
