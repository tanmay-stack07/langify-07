<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const features = [
  { 
    num: '01', 
    title: 'Zero Config', 
    desc: 'No source language selection needed. Whisper auto-detects and syncs instantly.',
    color: 'cyan',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z'
  },
  { 
    num: '02', 
    title: 'Dual-Model Pipeline', 
    desc: 'Whisper for STT + LLaMA-3.3-70B for high-nuance, context-aware translation.',
    color: 'blue',
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
  },
  { 
    num: '03', 
    title: 'Pulse Flow', 
    desc: '5-second audio chunking for near-zero latency and continuous stream processing.',
    color: 'emerald',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
  }
];

const stats = [
  { label: 'Languages', value: '50+' },
  { label: 'Latency', value: '<2s' },
  { label: 'Accuracy', value: '95%' },
  { label: 'Cost', value: 'Free*' },
];

const visible = ref(false);
const mouseX = ref(50);
const mouseY = ref(50);
const orbs = ref([
  { x: 20, y: 30, size: 300, color: 'cyan', delay: 0 },
  { x: 80, y: 60, size: 250, color: 'blue', delay: 0.5 },
  { x: 60, y: 20, size: 200, color: 'purple', delay: 1 },
]);

const handleMouseMove = (e) => {
  mouseX.value = (e.clientX / window.innerWidth) * 100;
  mouseY.value = (e.clientY / window.innerHeight) * 100;
};

onMounted(() => {
  setTimeout(() => visible.value = true, 100);
  window.addEventListener('mousemove', handleMouseMove);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
});
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white overflow-hidden">
    <!-- Dynamic Background Effects -->
    <div class="fixed inset-0 pointer-events-none">
      <!-- Animated orbs that follow mouse -->
      <div 
        v-for="(orb, i) in orbs" 
        :key="i"
        class="absolute rounded-full blur-[120px] transition-all duration-1000 ease-out animate-float"
        :style="{
          left: `${orb.x + (mouseX - 50) * 0.02}%`,
          top: `${orb.y + (mouseY - 50) * 0.02}%`,
          width: `${orb.size}px`,
          height: `${orb.size}px`,
          background: orb.color === 'cyan' ? 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)' : 
                      orb.color === 'blue' ? 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' :
                      'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
          animationDelay: `${orb.delay}s`
        }"
      ></div>
      
      <!-- Grid overlay -->
      <div class="absolute inset-0 opacity-[0.02]" style="background-image: linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px); background-size: 80px 80px;"></div>
      
      <!-- Noise texture overlay -->
      <div class="absolute inset-0 opacity-[0.015]" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>
    </div>

    <!-- Hero Section -->
    <section class="relative pt-32 pb-24 px-6">
      <div class="max-w-5xl mx-auto text-center">
        <!-- Animated Badge -->
        <div class="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-10 animate-slide-up group hover:border-cyan-500/40 transition-all duration-500"
             :class="{ 'opacity-0': !visible }">
          <div class="relative">
            <div class="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute inset-0"></div>
            <div class="w-2 h-2 rounded-full bg-emerald-400 relative"></div>
          </div>
          <span class="text-[11px] font-semibold tracking-wider uppercase text-cyan-400/80">Powered by Groq AI</span>
        </div>

        <!-- Main Heading with Glitch Effect -->
        <h1 class="relative text-5xl sm:text-6xl md:text-[8rem] font-black tracking-tighter leading-[0.85] mb-8 animate-slide-up stagger-1"
            :class="{ 'opacity-0': !visible }">
          <!-- Glow behind text -->
          <span class="absolute inset-0 blur-3xl opacity-20 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 -z-10"></span>
          
          <span class="block bg-gradient-to-b from-white via-white/90 to-white/60 bg-clip-text text-transparent">MULTI</span>
          <span class="block bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">LINGUAL</span>
          <span class="block mt-2 bg-gradient-to-b from-white via-white/50 to-white/20 bg-clip-text text-transparent">SPEECH</span>
        </h1>

        <!-- Audio Waveform Visualization -->
        <div class="flex items-center justify-center gap-1 mb-8 h-14 animate-slide-up stagger-2"
             :class="{ 'opacity-0': !visible }">
          <div v-for="i in 20" :key="i" 
               class="w-1.5 bg-gradient-to-t from-cyan-400 via-blue-500 to-cyan-400 rounded-full"
               :style="{ height: `${20 + Math.abs(Math.sin(i * 0.7) * 30 + Math.cos(i * 0.3) * 15)}px` }">
          </div>
        </div>

        <!-- Subtitle -->
        <p class="text-lg md:text-xl font-light text-white/50 max-w-2xl mx-auto mb-14 leading-relaxed animate-slide-up stagger-3"
           :class="{ 'opacity-0': !visible }">
          The universal live translation platform. 
          <span class="text-white/70 font-normal">Speak any language.</span>
          <br class="hidden sm:block"/>
          <span class="text-cyan-400/80 font-medium">Always get your language back</span> — zero config.
        </p>

        <!-- CTAs with enhanced effects -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-5 mb-20 animate-slide-up stagger-4"
             :class="{ 'opacity-0': !visible }">
          <router-link to="/translate"
            class="group relative px-10 py-5 rounded-full overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95">
            <!-- Glow effect -->
            <div class="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
            <div class="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
            <div class="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <!-- Icon -->
            <span class="relative z-10 flex items-center gap-3 text-sm font-bold tracking-widest uppercase">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Live Pulse
            </span>
          </router-link>
          
          <router-link to="/upload"
            class="group relative px-10 py-5 rounded-full border border-white/15 bg-white/[0.03] text-sm font-bold tracking-widest uppercase overflow-hidden hover:bg-white/[0.06] hover:border-white/25 transition-all duration-300">
            <span class="flex items-center gap-3">
              <svg class="w-5 h-5 text-white/60 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload File
            </span>
          </router-link>
        </div>

        <!-- Stats Bar with glass effect -->
        <div class="inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-2 animate-slide-up stagger-5"
             :class="{ 'opacity-0': !visible }">
          <div v-for="(stat, i) in stats" :key="stat.label" 
               class="px-6 py-3 text-center"
               :class="{ 'border-r border-white/5': i < stats.length - 1 }">
            <div class="text-2xl md:text-3xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">{{ stat.value }}</div>
            <div class="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-0.5">{{ stat.label }}</div>
          </div>
        </div>
      </div>
      
      <!-- Scroll indicator -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span class="text-[10px] uppercase tracking-widest text-white/20">Scroll</span>
        <svg class="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>

    <!-- Features Section -->
    <section class="relative py-32 px-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-20">
          <span class="inline-block px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-[10px] font-semibold tracking-[0.2em] uppercase text-cyan-400/70 mb-6">Core Technology</span>
          <h2 class="text-4xl md:text-5xl font-bold tracking-tight mb-5">How It Works</h2>
          <p class="text-white/40 font-light max-w-lg mx-auto text-lg">Three pillars of our AI-powered translation engine</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div v-for="(f, i) in features" :key="f.num" 
               class="group relative p-8 rounded-3xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 cursor-default overflow-hidden">
            <!-- Gradient glow on hover -->
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                 :style="`background: radial-gradient(800px circle at 50% 0%, rgba(${f.color === 'cyan' ? '6,182,212,' : f.color === 'blue' ? '59,130,246,' : '52,211,153,'}0.1), transparent 60%);`">
            </div>

            <div class="relative">
              <!-- Icon -->
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                   :class="{
                     'bg-cyan-500/10 text-cyan-400': f.color === 'cyan',
                     'bg-blue-500/10 text-blue-400': f.color === 'blue',
                     'bg-emerald-500/10 text-emerald-400': f.color === 'emerald'
                   }">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="f.icon" />
                </svg>
              </div>
              
              <div class="text-[10px] font-mono tracking-[0.3em] uppercase mb-4"
                   :class="{
                     'text-cyan-500/60': f.color === 'cyan',
                     'text-blue-500/60': f.color === 'blue',
                     'text-emerald-500/60': f.color === 'emerald'
                   }">
                {{ f.num }}
              </div>
              <h3 class="font-bold text-base tracking-wider uppercase mb-4 text-white/90">{{ f.title }}</h3>
              <p class="text-sm text-white/40 font-light leading-relaxed">{{ f.desc }}</p>
            </div>
            
            <!-- Bottom accent line -->
            <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r transparent via-current to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                 :class="{
                   'via-cyan-500': f.color === 'cyan',
                   'via-blue-500': f.color === 'blue',
                   'via-emerald-500': f.color === 'emerald'
                 }">
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pipeline Visual -->
    <section class="relative py-20 px-6">
      <div class="max-w-4xl mx-auto">
        <div class="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-10 md:p-16 overflow-hidden">
          <!-- Glow effect -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div class="relative">
            <h3 class="text-xs font-semibold tracking-[0.3em] uppercase text-cyan-400/60 mb-12 text-center">The Translation Pipeline</h3>
            
            <!-- Pipeline steps -->
            <div class="flex items-center justify-between gap-4">
              <!-- Audio In -->
              <div class="flex flex-col items-center text-center group">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20 flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:border-cyan-500/40 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                  <svg class="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div class="text-xs font-semibold tracking-wider uppercase text-white/80">Audio In</div>
                <div class="text-[10px] text-white/30 mt-1">5s chunks</div>
              </div>

              <!-- Connector -->
              <div class="flex-1 flex items-center justify-center">
                <div class="w-full h-px bg-gradient-to-r from-cyan-500/50 via-cyan-500/20 to-blue-500/50 relative">
                  <div class="absolute inset-0 animate-pulse bg-cyan-400/20"></div>
                </div>
              </div>

              <!-- Whisper -->
              <div class="flex flex-col items-center text-center group">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:border-blue-500/40 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                  <span class="text-lg font-bold text-blue-400">W</span>
                </div>
                <div class="text-xs font-semibold tracking-wider uppercase text-white/80">Whisper</div>
                <div class="text-[10px] text-white/30 mt-1">STT + Detect</div>
              </div>

              <!-- Connector -->
              <div class="flex-1 flex items-center justify-center">
                <div class="w-full h-px bg-gradient-to-r from-blue-500/50 via-blue-500/20 to-emerald-500/50 relative">
                  <div class="absolute inset-0 animate-pulse bg-blue-400/20" style="animation-delay: 0.3s;"></div>
                </div>
              </div>

              <!-- LLaMA -->
              <div class="flex flex-col items-center text-center group">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:border-emerald-500/40 group-hover:shadow-[0_0_30px_rgba(52,211,153,0.2)]">
                  <span class="text-lg font-bold text-emerald-400">L</span>
                </div>
                <div class="text-xs font-semibold tracking-wider uppercase text-white/80">LLaMA 3.3</div>
                <div class="text-[10px] text-white/30 mt-1">Translate</div>
              </div>

              <!-- Connector -->
              <div class="flex-1 flex items-center justify-center">
                <div class="w-full h-px bg-gradient-to-r from-emerald-500/50 via-emerald-500/20 to-purple-500/50 relative">
                  <div class="absolute inset-0 animate-pulse bg-emerald-400/20" style="animation-delay: 0.6s;"></div>
                </div>
              </div>

              <!-- Output -->
              <div class="flex flex-col items-center text-center group">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:border-purple-500/40 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                  <svg class="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="text-xs font-semibold tracking-wider uppercase text-white/80">Output</div>
                <div class="text-[10px] text-white/30 mt-1">Translated</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="relative py-32 px-6">
      <div class="max-w-3xl mx-auto text-center relative">
        <!-- Glow effect -->
        <div class="absolute inset-0 -z-10">
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 rounded-full blur-[100px]"></div>
        </div>
        
        <h2 class="text-4xl md:text-6xl font-black tracking-tighter mb-8">
          Ready to <span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">translate</span>?
        </h2>
        <p class="text-white/40 font-light mb-12 max-w-lg mx-auto text-lg">Start a live session or upload an audio file for instant multilingual transcription and translation.</p>
        <router-link to="/translate"
          class="group relative inline-flex items-center gap-3 px-12 py-5 rounded-full overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95">
          <!-- Glow -->
          <div class="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <span class="relative z-10 flex items-center gap-3 text-sm font-bold tracking-widest uppercase">
            Launch Pulse Engine
            <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-white/[0.06] py-10 px-6">
      <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-3">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span class="text-sm font-semibold tracking-wide text-white/60">MULTILINGUAL<span class="text-cyan-400/80">SPEECH</span></span>
        </div>
        
        <div class="text-xs text-white/25">© 2026 Multilingual Speech. Capstone Project.</div>
        
        <div class="flex items-center gap-5">
          <span class="text-[10px] text-white/20 tracking-wider uppercase">Groq</span>
          <span class="text-[10px] text-white/20 tracking-wider uppercase">Whisper</span>
          <span class="text-[10px] text-white/20 tracking-wider uppercase">Supabase</span>
          <span class="text-[10px] text-white/20 tracking-wider uppercase">Vue.js</span>
        </div>
      </div>
    </footer>
  </div>
</template>
