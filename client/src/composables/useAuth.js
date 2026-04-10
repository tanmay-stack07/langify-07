import axios from 'axios';
import { computed, ref } from 'vue';

const API_BASE = 'http://localhost:3000';
const currentUser = ref(null);
const authReady = ref(false);
const authLoading = ref(false);

async function hydrateUser() {
  if (authLoading.value) return;

  authLoading.value = true;

  try {
    const response = await axios.get(`${API_BASE}/api/auth/me`, {
      validateStatus: (status) => status === 200 || status === 401
    });
    currentUser.value = response.status === 200 ? response.data.user : null;
  } catch {
    currentUser.value = null;
  } finally {
    authReady.value = true;
    authLoading.value = false;
  }
}

export function useAuth() {
  const isAuthenticated = computed(() => !!currentUser.value);
  const testingGuest = () => {
    currentUser.value = {
      id: 'guest-session',
      email: 'guest@langify.local',
      name: 'Guest Tester',
      isGuest: true
    };
    authReady.value = true;
    return currentUser.value;
  };

  const ensureAuth = async () => {
    if (!authReady.value) {
      await hydrateUser();
    }
  };

  const signup = async ({ name, email, password }) => {
    const response = await axios.post(`${API_BASE}/api/auth/signup`, {
      name: name?.trim(),
      email: email?.trim(),
      password
    });
    currentUser.value = response.data.user;
    authReady.value = true;
    return response.data.user;
  };

  const login = async ({ email, password }) => {
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: email?.trim(),
      password
    });
    currentUser.value = response.data.user;
    authReady.value = true;
    return response.data.user;
  };

  const logout = async () => {
    await axios.post(`${API_BASE}/api/auth/logout`);
    currentUser.value = null;
    authReady.value = true;
  };

  return {
    currentUser,
    isAuthenticated,
    authReady,
    authLoading,
    ensureAuth,
    hydrateUser,
    signup,
    login,
    testingGuest,
    logout
  };
}
