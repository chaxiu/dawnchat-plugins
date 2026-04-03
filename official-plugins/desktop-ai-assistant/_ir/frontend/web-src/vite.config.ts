import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  build: {
    outDir: resolve(__dirname, "../web"),
    emptyOutDir: true,
  },
  test: {
    setupFiles: [resolve(__dirname, "src/test/setup.ts")],
  },
  plugins: [vue()],
});
