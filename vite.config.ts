import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const PACKAGE_GROUPS: Array<{ chunkName: string; packages: string[] }> = [
  {
    chunkName: "react-vendor",
    packages: ["react", "react-dom", "scheduler", "react-router", "react-router-dom"],
  },
  {
    chunkName: "data-vendor",
    packages: [
      "@reduxjs/toolkit",
      "@supabase/auth-ui-react",
      "@supabase/auth-ui-shared",
      "@supabase/supabase-js",
      "@tanstack/react-query",
      "immer",
      "react-redux",
      "redux-persist",
    ],
  },
  {
    chunkName: "ui-vendor",
    packages: [
      "@phosphor-icons/react",
      "@radix-ui",
      "class-variance-authority",
      "clsx",
      "cmdk",
      "input-otp",
      "lucide-react",
      "sonner",
      "tailwind-merge",
      "vaul",
    ],
  },
  {
    chunkName: "motion-vendor",
    packages: ["@use-gesture/react", "framer-motion", "motion-dom", "motion-utils", "react-swipeable"],
  },
  {
    chunkName: "markdown-vendor",
    packages: [
      "ccount",
      "decode-named-character-reference",
      "mdast-util",
      "micromark",
      "react-markdown",
      "remark-gfm",
      "remark-parse",
      "remark-rehype",
      "rehype",
      "unified",
      "vfile",
    ],
  },
  {
    chunkName: "charts-vendor",
    packages: ["d3-", "internmap", "recharts", "recharts-scale", "victory-vendor"],
  },
];

const getPackageName = (id: string): string | null => {
  const pathAfterNodeModules = id.split("node_modules/")[1];
  if (!pathAfterNodeModules) return null;

  const segments = pathAfterNodeModules.split("/");
  if (segments[0].startsWith("@")) {
    return `${segments[0]}/${segments[1]}`;
  }

  return segments[0];
};

const getManualChunkName = (id: string): string | undefined => {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  const packageName = getPackageName(id);
  if (!packageName) {
    return undefined;
  }

  for (const group of PACKAGE_GROUPS) {
    if (group.packages.some((entry) => packageName === entry || packageName.startsWith(entry))) {
      return group.chunkName;
    }
  }

  return "vendor";
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ].filter(Boolean),
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
 
