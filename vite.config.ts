import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "app"),
      "@api": path.resolve(__dirname, "api"),
      "@streams": path.resolve(__dirname, "streams"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
