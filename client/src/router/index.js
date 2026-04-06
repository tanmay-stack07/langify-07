import { createRouter, createWebHistory } from 'vue-router';
import LandingPage from '../views/LandingPage.vue';
import LiveTranslate from '../views/LiveTranslate.vue';
import FileUpload from '../views/FileUpload.vue';
import SessionHistory from '../views/SessionHistory.vue';

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage
  },
  {
    path: '/translate',
    name: 'LiveTranslate',
    component: LiveTranslate
  },
  {
    path: '/upload',
    name: 'FileUpload',
    component: FileUpload
  },
  {
    path: '/history',
    name: 'SessionHistory',
    component: SessionHistory
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
