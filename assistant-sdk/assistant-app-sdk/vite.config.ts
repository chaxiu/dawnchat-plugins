import { resolve } from "node:path";

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const entry = (file: string) => resolve(__dirname, file);

export default defineConfig({
  plugins: [
    dts({
      entryRoot: "src",
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
      formats: ["es"],
    },
    minify: false,
    rollupOptions: {
      external: ["@dawnchat/host-orchestration-sdk", /^@dawnchat\/host-orchestration-sdk\//],
      output: {
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
  },
  test: {
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});
