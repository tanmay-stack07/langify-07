<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const mobileMenuOpen = ref(false);
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]" 
       style="background: rgba(5, 5, 5, 0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <!-- Logo -->
      <router-link to="/" class="flex items-center gap-3 group">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <span class="text-sm font-semibold tracking-wide">MULTILINGUAL<span class="text-cyan-400">SPEECH</span></span>
      </router-link>

      <!-- Desktop Nav -->
      <div class="hidden md:flex items-center gap-1">
        <router-link to="/" 
          class="px-4 py-2 text-xs font-medium tracking-wider uppercase rounded-lg transition-all duration-200"
          :class="route.path === '/' ? 'text-white bg-white/[0.08]' : 'text-white/50 hover:text-white hover:bg-white/[0.04]'">
          Home
        </router-link>
        <router-link to="/translate" 
          class="px-4 py-2 text-xs font-medium tracking-wider uppercase rounded-lg transition-all duration-200"
          :class="route.path === '/translate' ? 'text-white bg-white/[0.08]' : 'text-white/50 hover:text-white hover:bg-white/[0.04]'">
          Live Translate
        </router-link>
        <router-link to="/upload" 
          class="px-4 py-2 text-xs font-medium tracking-wider uppercase rounded-lg transition-all duration-200"
          :class="route.path === '/upload' ? 'text-white bg-white/[0.08]' : 'text-white/50 hover:text-white hover:bg-white/[0.04]'">
          File Upload
        </router-link>
        <router-link to="/history" 
          class="px-4 py-2 text-xs font-medium tracking-wider uppercase rounded-lg transition-all duration-200"
          :class="route.path === '/history' ? 'text-white bg-white/[0.08]' : 'text-white/50 hover:text-white hover:bg-white/[0.04]'">
          History
        </router-link>
        <router-link to="/planned-ui" 
          class="px-4 py-2 text-xs font-medium tracking-wider uppercase rounded-lg transition-all duration-200"
          :class="route.path === '/planned-ui' ? 'text-white bg-white/[0.08]' : 'text-white/50 hover:text-white hover:bg-white/[0.04]'">
          Planned UI
        </router-link>
      </div>

      <!-- CTA -->
      <div class="hidden md:block">
        <router-link to="/translate" 
          class="px-5 py-2 text-xs font-semibold tracking-wider uppercase rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95">
          Start Session
        </router-link>
      </div>

      <!-- Mobile toggle -->
      <button @click="mobileMenuOpen = !mobileMenuOpen" class="md:hidden p-2 text-white/60 hover:text-white">
        <svg v-if="!mobileMenuOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Mobile Menu -->
    <transition name="slide">
      <div v-if="mobileMenuOpen" class="md:hidden border-t border-white/[0.06] px-6 py-4 space-y-2"
           style="background: rgba(5, 5, 5, 0.95); backdrop-filter: blur(20px);">
        <router-link @click="mobileMenuOpen = false" to="/" class="block px-4 py-3 text-sm rounded-lg hover:bg-white/[0.06] transition-colors">Home</router-link>
        <router-link @click="mobileMenuOpen = false" to="/translate" class="block px-4 py-3 text-sm rounded-lg hover:bg-white/[0.06] transition-colors">Live Translate</router-link>
        <router-link @click="mobileMenuOpen = false" to="/upload" class="block px-4 py-3 text-sm rounded-lg hover:bg-white/[0.06] transition-colors">File Upload</router-link>
        <router-link @click="mobileMenuOpen = false" to="/history" class="block px-4 py-3 text-sm rounded-lg hover:bg-white/[0.06] transition-colors">History</router-link>
        <router-link @click="mobileMenuOpen = false" to="/planned-ui" class="block px-4 py-3 text-sm rounded-lg hover:bg-white/[0.06] transition-colors">Planned UI</router-link>
      </div>
    </transition>
  </nav>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
