import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 【铁律 1】：强制所有构建产物使用相对路径！
  base: './', 
  server: {
    host: '0.0.0.0', // 暴露给局域网
    port: 5173,
  }
})
