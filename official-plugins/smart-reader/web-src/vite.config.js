import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@dawnchat/sdk/ui/vue': resolve(__dirname, '../../../sdk/dawnchat_sdk/ui/vue'),
      '@dawnchat/shared-ui': resolve(__dirname, '../../../shared-ui/src'),
      '@dawnchat/shared-protocol': resolve(__dirname, '../../../shared-protocol/src'),
      // shared-ui is resolved from repo source outside this package, so pin
      // its third-party imports to this web app's dependencies.
      'lucide-vue-next': resolve(__dirname, 'node_modules/lucide-vue-next')
    },
    dedupe: ['vue']
  },
  base: '/',
  build: {
    outDir: resolve(__dirname, '../web'),
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
