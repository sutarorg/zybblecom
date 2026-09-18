import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Small server bundle used only at build time to prerender public marketing URLs. */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    ssr: "src/prerender.tsx",
    outDir: ".ssr-build",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "prerender.mjs",
        format: "es",
      },
    },
  },
});
