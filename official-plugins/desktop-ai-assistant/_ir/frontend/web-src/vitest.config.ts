import { mergeConfig } from "vite";
import { defineConfig } from "vitest/config";

import viteConfig from "./vite.config";

// Merge Vite resolve (e.g. preserveSymlinks for workspace packages) so Vitest
// shares the same module graph as the app build.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      include: ["src/**/*.spec.ts"],
      setupFiles: ["src/test/setup.ts"],
    },
  })
);
