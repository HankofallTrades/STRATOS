import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const coachApiDevPlugin = (mode: string): Plugin => {
  const rawEnvironment = loadEnv(mode, process.cwd(), "");
  const createCoachApiMiddleware = async () => {
    const { handleCoachAgentRequest, resolveCoachAgentEnvironment } =
      await import("./src/domains/guidance/agent/http.ts");

    const coachAgentEnvironment =
      resolveCoachAgentEnvironment(rawEnvironment);

    return async (req: any, res: any, next: () => void) => {
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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    coachApiDevPlugin(mode),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
 
