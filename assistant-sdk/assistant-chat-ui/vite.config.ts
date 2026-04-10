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
      },
      cssFileName: "style",
      formats: ["es"],
    },
    minify: false,
    rollupOptions: {
      external: ["vue"],
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
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});
