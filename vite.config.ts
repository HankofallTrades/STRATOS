import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "path";
import { getManualChunkName } from "./src/lib/build/manualChunks";

const coachApiDevPlugin = (mode: string): Plugin => {
  const rawEnvironment = loadEnv(mode, process.cwd(), "");
  const createCoachApiMiddleware = async () => {
    const { handleCoachAgentRequest, resolveCoachAgentEnvironment } =
      await import("./src/domains/guidance/agent/http.ts");

    const coachAgentEnvironment =
      resolveCoachAgentEnvironment(rawEnvironment);

    return async (
      req: IncomingMessage,
      res: ServerResponse<IncomingMessage>,
      next: () => void
    ) => {
      if (req.method !== "POST") {
        next();
        return;
      }

      try {
        const bodyChunks: Uint8Array[] = [];
        for await (const chunk of req) {
          bodyChunks.push(
            typeof chunk === "string" ? Buffer.from(chunk) : chunk
          );
        }

        const rawBody = Buffer.concat(bodyChunks).toString("utf8");
        const parsedBody = rawBody ? JSON.parse(rawBody) : {};
        const response = await handleCoachAgentRequest({
          body: parsedBody,
          env: coachAgentEnvironment,
        });

        res.statusCode = response.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(response.body));
      } catch (error) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              error instanceof Error
                ? `Invalid JSON body for coach agent: ${error.message}`
                : "Invalid JSON body for coach agent.",
          })
        );
      }
    };
  };

  return {
    name: "coach-api-dev",
    async configurePreviewServer(server) {
      server.middlewares.use("/api/coach", await createCoachApiMiddleware());
    },
    async configureServer(server) {
      server.middlewares.use("/api/coach", await createCoachApiMiddleware());
    },
  };
};

/**
 * The iOS wrap serves the bundle from inside the binary, so a service worker has
 * nothing left to cache and its update flow fights Capacitor's. Only the web
 * target gets the PWA plugin; `npm run build` is unchanged.
 */
const isNativeBuild = process.env.STRATOS_TARGET === "ios";

/**
 * Where the wrap reaches the Coach function. The bundled app has no same-origin
 * `/api`, so a native build needs an absolute origin or every Coach turn dies
 * inside `capacitor://localhost`. This is the stable production alias, not a
 * per-deployment URL, so the binary keeps working as `main` redeploys.
 *
 * Whatever is set here must also be in the function's CORS allowlist — see
 * `COACH_ALLOWED_ORIGINS` in `src/domains/guidance/agent/cors.ts`.
 */
const NATIVE_COACH_API_BASE_URL = "https://stratos-theta.vercel.app";

/**
 * `.env` wins so a session can point the wrap at a branch deployment; the
 * production alias is only the fallback. The web target resolves to an empty
 * base, which keeps its request on the relative same-origin path.
 */
const resolveCoachApiBaseUrl = (mode: string): string => {
  const configured = loadEnv(mode, process.cwd(), "").VITE_COACH_API_BASE_URL;
  if (configured?.trim()) {
    return configured.trim();
  }

  return isNativeBuild ? NATIVE_COACH_API_BASE_URL : "";
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    coachApiDevPlugin(mode),
    !isNativeBuild &&
      VitePWA({
        includeAssets: ["favicon.ico", "icon-192.svg", "icon-512.svg"],
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              },
            },
          ],
        },
        manifest: {
          name: "STRATOS",
          short_name: "STRATOS",
          description: "Track your workouts, anywhere.",
          theme_color: "#000000",
          background_color: "#000000",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "/favicon.ico", sizes: "16x16 32x32", type: "image/x-icon" },
            { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
            {
              src: "/icon-512.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
      }),
  ].filter(Boolean),
  define: {
    "import.meta.env.VITE_COACH_API_BASE_URL": JSON.stringify(
      resolveCoachApiBaseUrl(mode)
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: getManualChunkName,
      },
    },
  },
}));
 
