import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep JavaScript and CSS as cacheable assets. The previous single-file
// plugin inlined the entire app into index.html, preventing browser caching
// and making the initial marketing page unnecessarily heavy.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    allowedHosts: true,
  },
  build: {
    assetsDir: "assets",
    sourcemap: false,
    cssCodeSplit: true,
  },
});
