import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { localApiMiddleware } from "./scripts/localApiMiddleware";

function manualChunks(id: string) {
  if (!id.includes("node_modules")) {
    return;
  }

  if (id.includes("recharts")) {
    return "vendor-charts";
  }

  if (id.includes("pptxgenjs") || id.includes("jszip")) {
    return "vendor-ppt";
  }

  if (id.includes("xlsx")) {
    return "vendor-xlsx";
  }

  if (id.includes("@supabase") || id.includes("@lovable.dev/cloud-auth-js")) {
    return "vendor-auth";
  }

  if (id.includes("react-markdown")) {
    return "vendor-markdown";
  }

  if (id.includes("framer-motion")) {
    return "vendor-motion";
  }

  if (id.includes("@radix-ui")) {
    return "vendor-radix";
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    server: {
      host: "::",
      port: 3001,
      hmr: {
        overlay: false,
      },
    },
    plugins: [localApiMiddleware(), react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  };
});
