import { resolve } from "node:path";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const entry = (file: string) => resolve(__dirname, file);

export default defineConfig({
  plugins: [
    vue(),
    dts({
      entryRoot: "src",
      exclude: ["src/**/__tests__/**"],
      outDir: "dist",
      rollupTypes: true,
      tsconfigPath: entry("tsconfig.json"),
    }),
  ],
  build: {
    copyPublicDir: false,
    emptyOutDir: true,
    lib: {
      entry: {
        index: entry("src/index.ts"),
        runtime: entry("src/runtime.ts"),
        view: entry("src/view.ts"),
        events: entry("src/events.ts"),
        guide: entry("src/guide.ts"),
        session: entry("src/session.ts"),
        observation: entry("src/observation.ts"),
        persistence: entry("src/persistence.ts"),
        browser: entry("src/browser.ts"),
      },
      cssFileName: "style",
      formats: ["es"],
    },
    minify: false,
    rollupOptions: {
      // Keep Vue external so consuming apps reuse one runtime instance.
      // Other UI/runtime libraries are bundled into assistant-core to avoid
      // preview-time resolution issues when the SDK is installed via file:
      // dependencies that point outside the plugin project tree.
      external: [
        "vue",
      ],
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") {
            return "style.css";
          }
          return "assets/[name]-[hash][extname]";
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
  },
});
