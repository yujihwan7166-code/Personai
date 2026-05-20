import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import { localApiMiddleware } from "./scripts/localApiMiddleware";

function manualChunks(id: string) {
  if (!id.includes("node_modules")) {
    return;
  }

  if (id.includes("@tiptap/pm") || id.includes("prosemirror")) {
    return "vendor-prosemirror";
  }

  if (id.includes("@tiptap") || id.includes("tiptap-markdown")) {
    return "vendor-tiptap";
  }

  if (id.includes("pdfjs-dist")) {
    return "vendor-pdf";
  }

  if (/[\\/]node_modules[\\/]d3(?:-|[\\/])/.test(id)) {
    return "vendor-d3";
  }

  if (id.includes("recharts")) {
    return "vendor-recharts";
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
    plugins: [
      localApiMiddleware(),
      react(),
      mode === "development" && componentTagger(),
      // ANALYZE=1 npm run build — dist/bundle-stats.html 생성. 평소 빌드에는 미적용.
      process.env.ANALYZE === "1" && visualizer({
        filename: "dist/bundle-stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      // ProseMirror "Duplicate use of selection JSON ID cell" 방지 — TipTap × Vite dev 환경에서
      // optimizeDeps 가 prosemirror 모듈을 별도 chunk 로 pre-bundle 하면 CellSelection 의
      // static jsonID('cell') 이 두 번 실행돼 RangeError. 단일 인스턴스 강제.
      dedupe: [
        '@tiptap/pm',
        'prosemirror-state',
        'prosemirror-view',
        'prosemirror-model',
        'prosemirror-transform',
        'prosemirror-tables',
        'prosemirror-keymap',
        'prosemirror-commands',
        'prosemirror-history',
        'prosemirror-schema-list',
        'prosemirror-dropcursor',
        'prosemirror-gapcursor',
      ],
    },
    optimizeDeps: {
      // 위 dedupe 와 짝 — prosemirror 패키지를 사전번들 단계에서 한 번에 묶어 인스턴스 갈라짐 차단.
      include: [
        'prosemirror-state',
        'prosemirror-view',
        'prosemirror-model',
        'prosemirror-transform',
        'prosemirror-tables',
      ],
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
