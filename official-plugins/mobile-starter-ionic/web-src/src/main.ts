import { createApp } from 'vue';
import { IonicVue } from '@ionic/vue';
import App from './App.vue';
import router from './router';

/* Core CSS required for Ionic components */
import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* Follow system appearance */
import '@ionic/vue/css/palettes/dark.system.css';

import './theme/variables.css';
import './styles/safe-area.css';
import './style.css';

const app = createApp(App);

app.use(IonicVue);
app.use(router);

router.isReady().then(() => {
  app.mount('#app');
});