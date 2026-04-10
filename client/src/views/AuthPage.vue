<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { login, signup, testingGuest, authLoading } = useAuth();
const mode = ref('login');
const error = ref('');

const loginForm = ref({
  email: '',
  password: ''
});

const signupForm = ref({
  name: '',
  email: '',
  password: ''
});

const submitLabel = computed(() => (mode.value === 'login' ? 'Continue to App' : 'Create Account'));

const submitLogin = async () => {
  if (!loginForm.value.email.trim() || !loginForm.value.password.trim()) {
    error.value = 'Enter email and password to continue.';
    return;
  }

  try {
    error.value = '';
    await login({ email: loginForm.value.email, password: loginForm.value.password });
    router.push('/planned-ui');
  } catch (err) {
    error.value = err.response?.data?.error || 'Login failed. Check your credentials and try again.';
  }
};

const submitSignup = async () => {
  if (!signupForm.value.name.trim() || !signupForm.value.email.trim() || !signupForm.value.password.trim()) {
    error.value = 'Fill in name, email, and password to create the account.';
    return;
  }

  try {
    error.value = '';
    await signup({
      name: signupForm.value.name,
      email: signupForm.value.email,
      password: signupForm.value.password
    });
    router.push('/planned-ui');
  } catch (err) {
    error.value = err.response?.data?.error || 'Sign up failed. Please try again.';
  }
};

const continueAsGuest = () => {
  error.value = '';
  testingGuest();
  router.push('/planned-ui');
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-page__glow auth-page__glow--left"></div>
    <div class="auth-page__glow auth-page__glow--right"></div>

    <section class="auth-shell">
      <div class="auth-intro">
        <p class="auth-intro__eyebrow">Langify Access</p>
        <h1>Enter the app.</h1>
        <p>
          Sign up or log in through the backend auth flow. Sessions and history then stay tied to
          the correct user in the database.
        </p>

        <div class="auth-intro__chips">
          <span>Supabase-backed auth</span>
          <span>Protected app route</span>
          <span>User-owned sessions</span>
        </div>
      </div>

      <div class="auth-card">
        <div class="auth-switch">
          <button type="button" :class="{ active: mode === 'login' }" @click="mode = 'login'">Login</button>
          <button type="button" :class="{ active: mode === 'signup' }" @click="mode = 'signup'">Sign Up</button>
        </div>

        <form v-if="mode === 'login'" class="auth-form" @submit.prevent="submitLogin">
          <label>
            <span>Email</span>
            <input v-model="loginForm.email" type="email" placeholder="you@example.com" />
          </label>
          <label>
            <span>Password</span>
            <input v-model="loginForm.password" type="password" placeholder="Enter any password" />
          </label>
          <button type="submit" class="auth-submit" :disabled="authLoading">{{ authLoading ? 'Working...' : submitLabel }}</button>
        </form>

        <form v-else class="auth-form" @submit.prevent="submitSignup">
          <label>
            <span>Name</span>
            <input v-model="signupForm.name" type="text" placeholder="Your name" />
          </label>
          <label>
            <span>Email</span>
            <input v-model="signupForm.email" type="email" placeholder="you@example.com" />
          </label>
          <label>
            <span>Password</span>
            <input v-model="signupForm.password" type="password" placeholder="Create any password" />
          </label>
          <button type="submit" class="auth-submit" :disabled="authLoading">{{ authLoading ? 'Working...' : submitLabel }}</button>
        </form>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <button type="button" class="auth-guest" @click="continueAsGuest">
          Continue to App for Testing
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  color: #f4f1ef;
  background:
    radial-gradient(circle at top, rgba(84, 141, 182, 0.14), transparent 22%),
    radial-gradient(circle at 85% 20%, rgba(244, 178, 120, 0.12), transparent 22%),
    linear-gradient(180deg, #06070c 0%, #0a0c14 50%, #06070c 100%);
  overflow: hidden;
}

.auth-page__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.auth-page__glow--left {
  background: radial-gradient(circle at 18% 32%, rgba(123, 219, 255, 0.12), transparent 22%);
}

.auth-page__glow--right {
  background: radial-gradient(circle at 84% 74%, rgba(244, 178, 120, 0.12), transparent 22%);
}

.auth-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(280px, 0.95fr) minmax(320px, 0.8fr);
  gap: 2rem;
  width: 100%;
  max-width: 1120px;
}

.auth-intro,
.auth-card {
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
}

.auth-intro {
  padding: 2.4rem;
  display: grid;
  align-content: center;
}

.auth-intro__eyebrow {
  color: #efc18e;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 0.78rem;
}

.auth-intro h1 {
  margin: 1rem 0;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.auth-intro p {
  color: rgba(244, 241, 239, 0.68);
  line-height: 1.8;
}

.auth-intro__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-top: 1.6rem;
}

.auth-intro__chips span {
  padding: 0.65rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(244, 241, 239, 0.74);
  text-decoration: none;
}

.auth-card {
  padding: 1.4rem;
}

.auth-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
  margin-bottom: 1.2rem;
}

.auth-switch button {
  padding: 0.95rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(244, 241, 239, 0.72);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.75rem;
  font-weight: 700;
}

.auth-switch button.active {
  color: #091017;
  background: linear-gradient(135deg, #86dfff, #f2c38a);
}

.auth-form {
  display: grid;
  gap: 1rem;
}

.auth-form label {
  display: grid;
  gap: 0.55rem;
}

.auth-form span {
  color: rgba(244, 241, 239, 0.56);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.auth-form input {
  width: 100%;
  padding: 1rem 1rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #f4f1ef;
}

.auth-submit {
  margin-top: 0.35rem;
  padding: 1rem 1.2rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(135deg, #86dfff, #f2c38a);
  color: #091017;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
  font-weight: 800;
}

.auth-error {
  margin-top: 0.9rem;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 115, 115, 0.25);
  background: rgba(255, 115, 115, 0.08);
  color: #ffb5b5;
}

.auth-guest {
  width: 100%;
  margin-top: 0.9rem;
  padding: 0.95rem 1.1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(244, 241, 239, 0.84);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  font-weight: 700;
}

@media (max-width: 900px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  .auth-page {
    padding: 1rem;
  }
}
</style>
