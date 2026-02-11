import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: {
      '@dawnchat/vue-tool-sdk': resolve(currentDir, '../../../sdk/dawnchat_sdk/ui/vue/tool/index.ts')
    }
  },
  build: {
    outDir: resolve(currentDir, '../web'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js'
      }
    }
  }
})
