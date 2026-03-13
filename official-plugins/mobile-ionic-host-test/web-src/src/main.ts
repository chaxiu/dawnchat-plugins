import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import App from './App.vue'

/* Ionic 核心 CSS (必须引入) */
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'

/* 可选的通用辅助样式 */
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'

/* 自动适配系统亮/暗色模式 */
import '@ionic/vue/css/palettes/dark.system.css'
import './style.css'
import './styles/safe-area.css'

const app = createApp(App)

// 注册 Ionic 引擎
app.use(IonicVue)

app.mount('#app')