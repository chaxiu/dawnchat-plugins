import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "./",
  // Inspector is injected by DawnChat's preview bootstrap only.
  // Keep production builds limited to the standard Vue plugin so publish artifacts stay clean.
  plugins: [vue()],
});
