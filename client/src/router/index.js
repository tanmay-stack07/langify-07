import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('../views/LandingPage.vue'),
    meta: { hideNavbar: true }
  },
  {
    path: '/translate',
    name: 'LiveTranslate',
    component: () => import('../views/LiveTranslate.vue')
  },
  {
    path: '/upload',
    name: 'FileUpload',
    component: () => import('../views/FileUpload.vue')
  },
  {
    path: '/history',
    name: 'SessionHistory',
    component: () => import('../views/SessionHistory.vue')
  },
  {
    path: '/planned-ui',
    name: 'PlannedUi',
    component: () => import('../views/PlannedUi.vue'),
    meta: { hideNavbar: true }
  },
  {
    path: '/auth',
    name: 'AuthPage',
    component: () => import('../views/AuthPage.vue'),
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

router.beforeEach((to) => {
  const { ensureAuth, isAuthenticated } = useAuth();

  return ensureAuth().then(() => {
    if (to.meta.requiresAuth && !isAuthenticated.value) {
      return { name: 'AuthPage' };
    }

    if (to.name === 'AuthPage' && isAuthenticated.value) {
      return { name: 'PlannedUi' };
    }

    return true;
  });
});

export default router;
