import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@monitor/sdk": path.resolve(
        rootDir,
        "../third_party/pulseboard/packages/sdk/src"
      )
    }
  },
  server: {
    port: 5176,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true
      },
      "/monitor-api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/monitor-api/, "")
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          markdown: ["react-markdown", "remark-gfm", "rehype-highlight", "highlight.js"],
          virtualized: ["react-virtualized"],
          monitor: ["rrweb", "web-vitals"]
        }
      }
    }
  }
});
