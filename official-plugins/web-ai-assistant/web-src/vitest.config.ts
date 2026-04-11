import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    // Keep specs under __tests__ only so feature/runtime code dirs stay free of *.spec.ts noise.
    include: ["src/**/__tests__/**/*.spec.ts"],
  },
});
