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
        "assistant-client": entry("src/assistant-client.ts"),
        "event-wait": entry("src/event-wait.ts"),
        "session-core": entry("src/session-core.ts"),
        transport: entry("src/transport.ts"),
        "tool-router": entry("src/tool-router.ts"),
        "agent-loop": entry("src/agent-loop.ts"),
        "vercel-ai": entry("src/vercel-ai.ts"),
        env: entry("src/env.ts"),
      },
      formats: ["es"],
    },
    minify: false,
    rollupOptions: {
      output: {
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
  },
});
