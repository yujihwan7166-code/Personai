import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3001,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
}));
