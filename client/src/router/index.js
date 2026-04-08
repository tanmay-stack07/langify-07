import { createRouter, createWebHistory } from 'vue-router';
import LandingPage from '../views/LandingPage.vue';
import LiveTranslate from '../views/LiveTranslate.vue';
import FileUpload from '../views/FileUpload.vue';
import SessionHistory from '../views/SessionHistory.vue';
import PlannedUi from '../views/PlannedUi.vue';
import AuthPage from '../views/AuthPage.vue';

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage,
    meta: { hideNavbar: true }
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
  },
  {
    path: '/planned-ui',
    name: 'PlannedUi',
    component: PlannedUi,
    meta: { hideNavbar: true }
  },
  {
    path: '/auth',
    name: 'AuthPage',
    component: AuthPage,
    meta: { hideNavbar: true }
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
