import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "./",
  optimizeDeps: {
    // assistant-core board layout intentionally targets elk.bundled.js.
    // Prebundling the package root can fall back to a Node-oriented entry and break browser previews.
    exclude: ["elkjs", "elkjs/lib/elk.bundled.js"],
  },
  build: {
    outDir: resolve(__dirname, "../web"),
    emptyOutDir: true,
  },
  plugins: [vue()],
});
