import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // 【铁律 1】：强制所有构建产物使用相对路径！
  base: './', 
  server: {
    // 允许局域网访问，供宿主 App 扫码 HMR
    host: '0.0.0.0',
    port: 5173
  },
})