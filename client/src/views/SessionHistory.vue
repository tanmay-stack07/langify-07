<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const sessions = ref([]);
const isLoading = ref(true);
const error = ref('');
const expandedSession = ref(null);
const sessionUtterances = ref({});

const loadSessions = async () => {
  isLoading.value = true;
  error.value = '';
  try {
    const response = await axios.get('http://localhost:3000/api/sessions');
    sessions.value = response.data.sessions || [];
  } catch (err) {
    // If API doesn't exist yet, show empty state
    sessions.value = [];
    error.value = '';
  } finally {
    isLoading.value = false;
  }
};

const toggleSession = async (sessionId) => {
  if (expandedSession.value === sessionId) {
    expandedSession.value = null;
    return;
  }
  expandedSession.value = sessionId;
  
  if (!sessionUtterances.value[sessionId]) {
    try {
      const response = await axios.get(`http://localhost:3000/api/sessions/${sessionId}/utterances`);
      sessionUtterances.value[sessionId] = response.data.utterances || [];
    } catch {
      sessionUtterances.value[sessionId] = [];
    }
  }
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

onMounted(loadSessions);
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <h1 class="text-3xl font-bold tracking-tight mb-2">Session History</h1>
          <p class="text-white/30 font-light">View past translation sessions stored in Supabase.</p>
        </div>
        <button @click="loadSessions" 
          class="px-4 py-2 text-xs rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-colors flex items-center gap-2 uppercase tracking-wider font-medium">
          <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center gap-4 py-20">
        <div class="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
        <span class="text-xs text-white/30 uppercase tracking-widest">Loading sessions...</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="p-6 rounded-xl border border-red-500/20 bg-red-500/[0.05] text-sm text-red-400 text-center">
        {{ error }}
      </div>

      <!-- Empty State -->
      <div v-else-if="sessions.length === 0" class="flex flex-col items-center justify-center gap-6 py-20">
        <div class="w-20 h-20 rounded-full border border-white/[0.06] flex items-center justify-center">
          <svg class="w-8 h-8 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="text-center">
          <p class="text-sm text-white/30 mb-1">No sessions yet</p>
          <p class="text-xs text-white/15">Start a live translation session to see history here.</p>
        </div>
        <router-link to="/translate"
          class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-semibold tracking-wider uppercase">
          Start Session
        </router-link>
      </div>

      <!-- Session List -->
      <div v-else class="space-y-3">
        <div v-for="session in sessions" :key="session.id"
             class="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all hover:border-white/[0.1]">
          
          <!-- Session Header -->
          <button @click="toggleSession(session.id)" 
            class="w-full p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <div class="text-sm font-medium">Session <span class="text-white/30 font-mono">{{ session.id.slice(0, 8) }}</span></div>
                <div class="text-[10px] text-white/20 mt-0.5">{{ formatDate(session.created_at) }}</div>
              </div>
            </div>
            <svg class="w-4 h-4 text-white/20 transition-transform" 
                 :class="{ 'rotate-180': expandedSession === session.id }"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Utterances -->
          <div v-if="expandedSession === session.id" class="border-t border-white/[0.04] p-5 space-y-4">
            <div v-if="!sessionUtterances[session.id]?.length" class="text-xs text-white/20 text-center py-4">No utterances in this session.</div>
            <div v-for="u in sessionUtterances[session.id]" :key="u.id" class="pl-4 border-l-2 border-cyan-500/20">
              <div class="text-[9px] text-white/20 font-mono mb-1">{{ formatDate(u.timestamp) }}</div>
              <div class="text-xs text-white/50 mb-0.5">{{ u.text_original }}</div>
              <div class="text-xs text-cyan-400">{{ u.text_translated }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
