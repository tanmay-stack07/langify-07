<script setup>
import { computed } from 'vue';

const props = defineProps({
  state: {
    type: String,
    default: 'idle' // 'idle', 'analyzing', 'processing', 'translating', 'complete'
  }
});

const statusText = computed(() => {
  switch (props.state) {
    case 'analyzing': return 'Detecting Language...';
    case 'processing': return 'Whisper Synthesizing...';
    case 'translating': return 'LLaMA Nuance Alignment...';
    case 'complete': return 'Translation Complete';
    default: return 'Jarvis Idle';
  }
});

const ringColor = computed(() => {
  switch (props.state) {
    case 'analyzing': return 'rgba(96, 165, 250, 0.6)';
    case 'processing': return 'rgba(6, 182, 212, 0.6)';
    case 'translating': return 'rgba(52, 211, 153, 0.6)';
    case 'complete': return 'rgba(168, 85, 247, 0.6)';
    default: return 'rgba(6, 182, 212, 0.2)';
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-6">
    <!-- Jarvis Orb -->
    <div class="relative w-44 h-44 flex items-center justify-center">
      <!-- Ripple effect when active -->
      <div v-if="state !== 'idle'" class="absolute inset-0 rounded-full animate-ripple"
           :style="{ border: `2px solid ${ringColor}` }"></div>
      <div v-if="state !== 'idle'" class="absolute inset-0 rounded-full animate-ripple"
           style="animation-delay: 0.5s;"
           :style="{ border: `2px solid ${ringColor}` }"></div>
      
      <!-- Outer Ring -->
      <div class="absolute inset-0 rounded-full border-2 transition-all duration-700"
           :class="state !== 'idle' ? 'animate-spin-slow' : ''"
           :style="{ 
             borderColor: ringColor, 
             boxShadow: state !== 'idle' ? `0 0 30px ${ringColor}` : 'none' 
           }">
      </div>
      
      <!-- Middle Ring -->
      <div class="absolute w-32 h-32 rounded-full border transition-all duration-700"
           :class="{
             'animate-pulse border-blue-400 scale-110': state === 'analyzing',
             'animate-spin-slow border-cyan-400': state === 'processing',
             'scale-110 border-emerald-400': state === 'translating',
             'scale-100 border-purple-400': state === 'complete',
             'border-white/10': state === 'idle'
           }"
           :style="{ 
             boxShadow: state !== 'idle' ? `0 0 25px ${ringColor}, inset 0 0 25px ${ringColor}` : 'none' 
           }">
      </div>

      <!-- Inner Ring -->
      <div class="absolute w-20 h-20 rounded-full border border-white/5 transition-all duration-500"
           :class="{ 'border-cyan-500/30 scale-105': state !== 'idle' }">
      </div>

      <!-- Core Node -->
      <div class="relative w-10 h-10 rounded-full transition-all duration-500 z-10"
           :class="{
             'bg-blue-400 shadow-[0_0_30px_rgba(96,165,250,0.8)]': state === 'analyzing',
             'bg-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.8)]': state === 'processing',
             'bg-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.8)]': state === 'translating',
             'bg-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.8)]': state === 'complete',
             'bg-white/80 shadow-[0_0_15px_rgba(255,255,255,0.5)]': state === 'idle'
           }">
      </div>
    </div>
    
    <!-- Status Text -->
    <div class="text-[10px] tracking-[0.25em] font-medium uppercase transition-all duration-500"
         :class="{
           'text-blue-400': state === 'analyzing',
           'text-cyan-400': state === 'processing',
           'text-emerald-400': state === 'translating',
           'text-purple-400': state === 'complete',
           'text-white/30': state === 'idle'
         }">
      <span :class="{ 'animate-pulse': state !== 'idle' && state !== 'complete' }">{{ statusText }}</span>
    </div>
  </div>
</template>
