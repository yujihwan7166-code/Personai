import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) {
              return "react-vendor";
            }
            if (id.includes("@radix-ui")) {
              return "radix-vendor";
            }
            if (id.includes("lucide-react")) {
              return "icons-vendor";
            }
            if (id.includes("@tanstack/react-query") || id.includes("@lovable.dev/cloud-auth-js")) {
              return "query-vendor";
            }
            if (id.includes("react-markdown") || id.includes("remark-") || id.includes("rehype-") || id.includes("unified") || id.includes("micromark") || id.includes("mdast") || id.includes("hast")) {
              return "markdown-vendor";
            }
            if (id.includes("@supabase")) {
              return "supabase-vendor";
            }
            if (id.includes("@dnd-kit")) {
              return "dnd-vendor";
            }
            if (id.includes("twemoji-parser") || id.includes("fluentui-emoji-js")) {
              return "emoji-vendor";
            }
            if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) {
              return "forms-vendor";
            }
            if (id.includes("pptxgenjs")) {
              return "ppt-vendor";
            }
            if (id.includes("recharts")) {
              return "chart-vendor";
            }
            if (id.includes("sonner") || id.includes("next-themes") || id.includes("vaul") || id.includes("react-day-picker") || id.includes("embla-carousel-react") || id.includes("react-resizable-panels")) {
              return "ui-vendor";
            }
            return "vendor";
          }
        },
      },
    },
  },
}));
