import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'
import 'pdfjs-dist/web/pdf_viewer.css'
import { fetchHostConfig } from './services/api'

const bootstrap = async () => {
  let hostConfig = null
  try {
    hostConfig = await fetchHostConfig()
  } catch {
    hostConfig = null
  }
  window.__SMART_READER_HOST__ = hostConfig
  createApp(App).mount('#app')
}

bootstrap()
