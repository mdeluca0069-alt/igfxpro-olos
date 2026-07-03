import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    strictPort: false,
    headers: {
      "X-Frame-Options":        "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy":        "strict-origin-when-cross-origin",
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws://localhost:3000 wss://localhost:3000 ws://localhost:5174 ws://localhost:5173 wss://ws.twelvedata.com",
        "media-src 'none'",
        "object-src 'none'",
        "frame-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    },
    proxy: {
      // All /api/* and /auth/* requests → backend on 3000
      // This eliminates CORS entirely — browser sees same-origin requests
      "/api": {
        target:      "http://localhost:3000",
        changeOrigin: true,
        secure:      false,
        bypass(req) {
          // Don't proxy Vite source-file requests (module serving)
          if (/\.(ts|tsx|js|jsx|css|svg|png|ico)(\?|$)/.test(req.url ?? "")) return req.url;
        },
      },
      "/auth": {
        target:      "http://localhost:3000",
        changeOrigin: true,
        secure:      false,
      },
      "/config": {
        target:      "http://localhost:3000",
        changeOrigin: true,
        secure:      false,
      },
      "/tenant": {
        target:      "http://localhost:3000",
        changeOrigin: true,
        secure:      false,
      },
      "/trading": {
        target:      "http://localhost:3000",
        changeOrigin: true,
        secure:      false,
        bypass(req) {
          // Browser navigation (HTML request) → serve SPA, not backend
          if (req.headers?.accept?.includes("text/html")) return "/index.html";
          const url = req.url ?? "";
          if (url.includes("?") || url.match(/\.(ts|tsx|js|jsx|css|svg|png)(\?|$)/)) return url;
        },
      },
      "/health": {
        target:      "http://localhost:3000",
        changeOrigin: true,
        secure:      false,
      },
      // WebSocket proxy
      "/ws": {
        target:  "ws://localhost:3000",
        ws:      true,
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      // Exclude MSW entirely from production bundles.
      // mocks/ is dev-only; if it is ever accidentally imported the runtime
      // guard in mocks/browser.ts will throw, but tree-shaking it out here
      // ensures zero bytes of mock code ship to users.
      external: ["msw", "msw/browser"],
      output: {
        manualChunks: {
          react:  ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          query:  ["@tanstack/react-query", "zustand"],
          icons:  ["lucide-react"],
        },
      },
    },
  },

  resolve: {
    alias: {
      "@app":    path.resolve(__dirname, "app"),
      "@api":    path.resolve(__dirname, "api"),
      "@streams": path.resolve(__dirname, "streams"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
