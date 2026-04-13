<template>
  <!-- ─────────────────────────────────────────────────────────────────────
    MeetingMode.vue
    Read-only live caption viewer. Joins a meeting room via Socket.IO
    and displays real-time utterances from the host's LiveTranslate session.
  ───────────────────────────────────────────────────────────────────────── -->
  <div class="meeting-mode">

    <!-- ── Connection header ── -->
    <header class="meeting-header">
      <div class="meeting-brand">
        <span class="brand-icon">📡</span>
        <h1 class="brand-title">Langify Meeting</h1>
      </div>

      <div class="meeting-meta">
        <div class="meta-item">
          <span class="meta-label">ROOM</span>
          <span class="meta-value mono">{{ displayRoomId }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">STATUS</span>
          <span class="meta-value" :class="{ 'status-live': connected, 'status-off': !connected }">
            <span class="status-dot" :class="{ pulse: connected }"></span>
            {{ connected ? 'LIVE' : error ? 'ERROR' : 'CONNECTING…' }}
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">MEMBERS</span>
          <span class="meta-value">{{ memberCount }}</span>
        </div>
      </div>
    </header>

    <!-- ── Error display ── -->
    <div v-if="error" class="meeting-error">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="retry">Retry Connection</button>
    </div>

    <!-- ── Live transcript feed ── -->
    <main class="meeting-feed">

      <!-- Empty state -->
      <div v-if="utterances.length === 0 && connected" class="empty-feed">
        <div class="empty-orb"></div>
        <p class="empty-title">Listening for captions…</p>
        <p class="empty-sub">The host is translating in real-time. Captions will appear here.</p>
      </div>

      <!-- Utterance cards (newest first) -->
      <TransitionGroup name="utterance" tag="div" class="utterance-list">
        <div
          v-for="utt in utterances"
          :key="utt.id"
          class="utterance-card"
          :class="`confidence-${confidenceTier(utt.confidence)}`"
        >
          <div class="card-header">
            <span class="lang-badge">{{ utt.detectedLanguage?.toUpperCase() || '??' }}</span>
            <span v-if="utt.emotionalTone" class="tone-badge" :class="`tone-${utt.emotionalTone}`">
              {{ utt.emotionalTone }}
            </span>
            <span class="confidence-label">{{ utt.confidence ?? '—' }}%</span>
          </div>

          <p class="text-original">{{ utt.textOriginal }}</p>

          <p class="text-translated" :class="`heatmap-${confidenceTier(utt.confidence)}`">
            <span class="heatmap-bar" :style="{ width: (utt.confidence ?? 0) + '%' }"></span>
            {{ utt.textTranslated }}
          </p>

          <div v-if="utt.alt1 || utt.alt2" class="alt-block">
            <span class="alt-label">ALTERNATIVES</span>
            <p v-if="utt.alt1" class="alt-text">{{ utt.alt1 }}</p>
            <p v-if="utt.alt2" class="alt-text">{{ utt.alt2 }}</p>
          </div>

          <span class="card-ts">{{ formatTimestamp(utt.timestamp) }}</span>
        </div>
      </TransitionGroup>

    </main>

    <!-- ── Footer ── -->
    <footer class="meeting-footer">
      <span class="footer-text">{{ utterances.length }} caption{{ utterances.length === 1 ? '' : 's' }} received</span>
      <button class="leave-btn" @click="leave">Leave Meeting</button>
    </footer>

  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMeeting } from '@/composables/useMeeting.js'

const route = useRoute()
const router = useRouter()

const {
  connected,
  roomId,
  memberCount,
  utterances,
  error,
  joinRoom,
  leaveRoom,
} = useMeeting()

// Room ID from URL params
const displayRoomId = computed(() => {
  const id = roomId.value || route.params.roomId || '—'
  return id.length > 8 ? id.slice(0, 8).toUpperCase() + '…' : id.toUpperCase()
})

// Join room on mount
onMounted(() => {
  const targetRoom = route.params.roomId
  if (targetRoom) {
    joinRoom(targetRoom, 'Viewer')
  }
})

function confidenceTier(confidence) {
  if (confidence == null) return 'unknown'
  if (confidence >= 85) return 'high'
  if (confidence >= 65) return 'medium'
  return 'low'
}

function formatTimestamp(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function retry() {
  const targetRoom = route.params.roomId
  if (targetRoom) joinRoom(targetRoom, 'Viewer')
}

function leave() {
  leaveRoom()
  router.push('/')
}
</script>

<style scoped>
/* ─────────────────────────────────────────────────────────────────────────────
   Meeting Mode — Dark HUD theme matching LiveTranslate
──────────────────────────────────────────────────────────────────────────── */
.meeting-mode {
  min-height: 100vh;
  background: #0a0a0f;
  color: #e2e8f0;
  font-family: 'Inter', 'JetBrains Mono', monospace;
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.meeting-header {
  padding: 1.25rem 2rem;
  border-bottom: 1px solid #1a202c;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.meeting-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  font-size: 22px;
}

.brand-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #63b3ed;
  margin: 0;
}

.meeting-meta {
  display: flex;
  gap: 1.5rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 9px;
  letter-spacing: 0.12em;
  color: #4a5568;
  font-weight: 600;
}

.meta-value {
  font-size: 13px;
  font-weight: 600;
  color: #a0aec0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-value.mono {
  font-family: 'JetBrains Mono', monospace;
  color: #63b3ed;
}

.status-live { color: #48bb78; }
.status-off  { color: #fc8181; }

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4a5568;
  flex-shrink: 0;
}

.status-dot.pulse {
  background: #48bb78;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.85); }
}

/* ── Error ── */
.meeting-error {
  padding: 1.5rem 2rem;
  background: #1a0d0d;
  border-bottom: 1px solid #742a2a;
  text-align: center;
}

.meeting-error p {
  color: #fc8181;
  font-size: 13px;
  margin-bottom: 10px;
}

.retry-btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid #742a2a;
  background: #2d1111;
  color: #fc8181;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #3d1a1a;
  border-color: #fc8181;
}

/* ── Feed ── */
.meeting-feed {
  flex: 1;
  padding: 1.5rem 2rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.empty-feed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 6rem 2rem;
}

.empty-orb {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid #1a202c;
  background: radial-gradient(circle at 40% 40%, #1a2744, #0a0a0f);
  animation: orb-idle 3s ease-in-out infinite;
}

@keyframes orb-idle {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,179,237,0.0); }
  50%       { box-shadow: 0 0 20px 4px rgba(99,179,237,0.12); }
}

.empty-title {
  font-size: 14px;
  color: #4a5568;
  letter-spacing: 0.08em;
}

.empty-sub {
  font-size: 12px;
  color: #2d3748;
  text-align: center;
}

.utterance-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Transition animations */
.utterance-enter-active { transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.utterance-enter-from   { opacity: 0; transform: translateY(-12px); }
.utterance-leave-active { transition: all 0.2s ease; }
.utterance-leave-to     { opacity: 0; transform: translateX(-20px); }

.utterance-card {
  padding: 14px 16px;
  border-radius: 10px;
  border-left: 3px solid #2d3748;
  background: #0d1117;
  position: relative;
  transition: border-color 0.3s ease;
}

.utterance-card.confidence-high   { border-left-color: #276749; }
.utterance-card.confidence-medium { border-left-color: #744210; }
.utterance-card.confidence-low    { border-left-color: #742a2a; }
.utterance-card.confidence-unknown { border-left-color: #2d3748; }

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.lang-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 2px 6px;
  border-radius: 4px;
  background: #1a202c;
  color: #63b3ed;
}

.tone-badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 20px;
  font-weight: 500;
  letter-spacing: 0.05em;
}
.tone-neutral   { background: #1a202c; color: #a0aec0; }
.tone-frustrated { background: #2d1111; color: #fc8181; }
.tone-urgent    { background: #2d1a00; color: #f6ad55; }
.tone-excited   { background: #0d2211; color: #68d391; }
.tone-sarcastic { background: #1a1029; color: #b794f4; }
.tone-formal    { background: #0d1a2d; color: #63b3ed; }

.confidence-label {
  font-size: 10px;
  color: #4a5568;
  margin-left: auto;
  font-family: monospace;
}

.text-original {
  font-size: 13px;
  color: #718096;
  margin-bottom: 6px;
  line-height: 1.5;
}

.text-translated {
  font-size: 15px;
  color: #e2e8f0;
  line-height: 1.6;
  font-weight: 400;
  position: relative;
  overflow: hidden;
}

.heatmap-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  opacity: 0.08;
  border-radius: 4px;
  transition: width 0.6s ease;
  pointer-events: none;
}

.heatmap-high .heatmap-bar  { background: #48bb78; }
.heatmap-medium .heatmap-bar { background: #d69e2e; }
.heatmap-low .heatmap-bar   { background: #fc8181; }
.heatmap-unknown .heatmap-bar { background: #4a5568; }

.alt-block {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #1a202c;
}

.alt-label {
  font-size: 9px;
  letter-spacing: 0.1em;
  color: #4a5568;
  font-weight: 600;
}

.alt-text {
  font-size: 12px;
  color: #718096;
  margin-top: 4px;
  font-style: italic;
}

.card-ts {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 10px;
  color: #2d3748;
  font-family: monospace;
}

/* ── Footer ── */
.meeting-footer {
  padding: 1rem 2rem;
  border-top: 1px solid #1a202c;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-text {
  font-size: 11px;
  color: #4a5568;
  letter-spacing: 0.04em;
}

.leave-btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid #742a2a;
  background: #1a0d0d;
  color: #fc8181;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.leave-btn:hover {
  background: #2d1111;
  border-color: #fc8181;
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .meeting-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .meeting-meta {
    width: 100%;
    justify-content: space-between;
  }
  .meeting-feed {
    padding: 1rem;
  }
}
</style>
