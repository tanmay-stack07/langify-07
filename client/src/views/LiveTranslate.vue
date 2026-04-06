<script setup>
import { ref, computed, nextTick } from 'vue';
import { useMediaRecorder } from '../composables/useMediaRecorder';
import { useSession } from '../composables/useSession';
import AiLoader from '../components/AiLoader.vue';
import JarvisOverlay from '../components/JarvisOverlay.vue';

const { isRecording, startRecording, stopRecording } = useMediaRecorder();
const { sessionId, utterances, isProcessing, targetLanguage, createSession, processAudioChunk } = useSession();

const loaderState = ref('idle');
const transcriptEl = ref(null);

const languages = [
  'English', 'Hindi', 'Spanish', 'French', 'German', 'Marathi', 'Tamil', 'Telugu',
  'Japanese', 'Korean', 'Chinese', 'Arabic', 'Portuguese', 'Russian', 'Italian'
];

const handleStart = async () => {
  await createSession();
  await startRecording(async (blob) => {
    loaderState.value = 'analyzing';
    setTimeout(() => { if (loaderState.value === 'analyzing') loaderState.value = 'processing'; }, 800);
    setTimeout(() => { if (loaderState.value === 'processing') loaderState.value = 'translating'; }, 1600);
    
    await processAudioChunk(blob);
    loaderState.value = 'complete';
    setTimeout(() => { loaderState.value = 'idle'; }, 1200);
    
    // Auto-scroll to bottom
    await nextTick();
    if (transcriptEl.value) {
      transcriptEl.value.scrollTop = transcriptEl.value.scrollHeight;
    }
  });
};

const handleStop = () => {
  stopRecording();
  loaderState.value = 'idle';
};

const elapsedTime = ref(0);
let timer = null;

const startTimer = () => {
  elapsedTime.value = 0;
  timer = setInterval(() => elapsedTime.value++, 1000);
};

const stopTimer = () => {
  if (timer) clearInterval(timer);
};

const formattedTime = computed(() => {
  const mins = Math.floor(elapsedTime.value / 60).toString().padStart(2, '0');
  const secs = (elapsedTime.value % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
});

const handleStartWithTimer = async () => {
  startTimer();
  await handleStart();
};

const handleStopWithTimer = () => {
  stopTimer();
  handleStop();
};
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white pt-16">
    <JarvisOverlay>
      <div class="flex flex-col lg:grid lg:grid-cols-12 h-full">
        
        <!-- Left Panel: Transcript -->
        <div class="lg:col-span-8 flex flex-col h-full border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          
          <!-- Header -->
          <div class="flex flex-wrap items-center justify-between gap-4 p-6 lg:p-8 border-b border-white/[0.06]">
            <div>
              <h1 class="text-lg font-semibold tracking-tight">
                Live Session 
                <span class="text-white/20 font-mono text-sm">#{{ sessionId?.slice(0, 8) || '--------' }}</span>
              </h1>
              <div class="flex items-center gap-3 mt-1">
                <div class="flex items-center gap-1.5">
                  <div class="w-1.5 h-1.5 rounded-full" :class="isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/20'"></div>
                  <span class="text-[10px] uppercase tracking-widest text-white/30">{{ isRecording ? 'Recording' : 'Standby' }}</span>
                </div>
                <span v-if="isRecording" class="text-[10px] font-mono text-white/30">{{ formattedTime }}</span>
              </div>
            </div>
            
            <!-- Language Selector -->
            <div class="flex items-center gap-3">
              <label class="text-[10px] uppercase tracking-widest text-white/30">Target</label>
              <select v-model="targetLanguage" 
                class="px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-white/[0.05] text-white appearance-none cursor-pointer hover:bg-white/[0.08] transition-colors focus:outline-none focus:border-cyan-500/50"
                style="-webkit-appearance: none;">
                <option v-for="lang in languages" :key="lang" :value="lang" class="bg-[#1a1a1a] text-white">{{ lang }}</option>
              </select>
            </div>
          </div>

          <!-- Transcript Area -->
          <div ref="transcriptEl" class="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 min-h-[300px]">
            <!-- Utterances -->
            <div v-for="(u, idx) in utterances" :key="u.id" 
                 class="animate-slide-up"
                 :style="{ animationDelay: `${idx * 0.05}s` }">
              <div class="flex items-center gap-2 mb-2">
                <div class="text-[9px] font-mono uppercase tracking-widest text-white/20">
                  {{ new Date(u.timestamp).toLocaleTimeString() }}
                </div>
                <div class="flex-1 h-px bg-white/[0.04]"></div>
              </div>
              <div class="text-sm font-light text-white/60 mb-1 leading-relaxed">{{ u.originalText }}</div>
              <div class="text-sm font-medium text-cyan-400 leading-relaxed">{{ u.translatedText }}</div>
            </div>

            <!-- Empty State -->
            <div v-if="utterances.length === 0" class="h-full flex flex-col items-center justify-center gap-4">
              <div class="w-16 h-16 rounded-full border border-white/[0.06] flex items-center justify-center">
                <svg class="w-6 h-6 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p class="text-xs text-white/15 tracking-wider uppercase">Speak to begin synthesis...</p>
            </div>
          </div>

          <!-- Controls -->
          <div class="p-6 lg:p-8 border-t border-white/[0.06] flex flex-wrap items-center gap-4">
            <button v-if="!isRecording" @click="handleStartWithTimer"
              class="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-sm font-semibold tracking-wider uppercase transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:scale-105 active:scale-95">
              Ignite Session
            </button>
            <button v-else @click="handleStopWithTimer"
              class="px-6 py-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold tracking-wider uppercase transition-all duration-300">
              Terminate Pulse
            </button>

            <div class="flex items-center gap-2 text-[10px] text-white/20 uppercase tracking-widest">
              <div class="w-1 h-1 rounded-full bg-cyan-400/50"></div>
              {{ utterances.length }} utterances captured
            </div>
          </div>
        </div>

        <!-- Right Panel: AI HUD -->
        <div class="lg:col-span-4 flex flex-col items-center justify-center p-8 bg-white/[0.01]">
          <AiLoader :state="loaderState" />

          <!-- Metrics -->
          <div class="w-full mt-10 space-y-4">
            <!-- Sync Strength -->
            <div>
              <div class="flex justify-between text-[9px] uppercase tracking-[0.15em] text-white/30 mb-2">
                <span>Sync Strength</span>
                <span>{{ isRecording ? '94' : '—' }}%</span>
              </div>
              <div class="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
                     :style="{ width: isRecording ? '94%' : '0%' }">
                </div>
              </div>
            </div>

            <!-- Model Status -->
            <div>
              <div class="flex justify-between text-[9px] uppercase tracking-[0.15em] text-white/30 mb-2">
                <span>Model Load</span>
                <span>{{ isProcessing ? '87' : '—' }}%</span>
              </div>
              <div class="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000"
                     :style="{ width: isProcessing ? '87%' : '0%' }">
                </div>
              </div>
            </div>

            <!-- Info cards -->
            <div class="grid grid-cols-2 gap-3 mt-6">
              <div class="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div class="text-[9px] uppercase tracking-widest text-white/20 mb-1">STT Model</div>
                <div class="text-xs font-semibold text-cyan-400">Whisper v3</div>
              </div>
              <div class="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div class="text-[9px] uppercase tracking-widest text-white/20 mb-1">LLM Model</div>
                <div class="text-xs font-semibold text-blue-400">LLaMA 3.3</div>
              </div>
              <div class="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div class="text-[9px] uppercase tracking-widest text-white/20 mb-1">Chunk Size</div>
                <div class="text-xs font-semibold text-emerald-400">5 sec</div>
              </div>
              <div class="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div class="text-[9px] uppercase tracking-widest text-white/20 mb-1">Provider</div>
                <div class="text-xs font-semibold text-purple-400">Groq</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </JarvisOverlay>
  </div>
</template>
