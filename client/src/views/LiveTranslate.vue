<template>
  <!-- ─────────────────────────────────────────────────────────────────────
    LiveTranslate.vue
    Dark-themed Jarvis HUD for real-time multilingual translation.
    All existing behaviour preserved. TTS additions are marked with
    comments starting with "── TTS".
  ───────────────────────────────────────────────────────────────────────── -->
  <div class="live-translate">

    <!-- ── Jarvis overlay (shows while a chunk is processing) ── -->
    <JarvisOverlay v-if="showJarvis" :phase="jarvisPhase" />

    <!-- ══ MAIN HUD LAYOUT ══════════════════════════════════════════════ -->
    <div class="hud-layout">

      <!-- ── LEFT: Control panel ───────────────────────────────────────── -->
      <aside class="control-panel">

        <!-- Session ID badge -->
        <div class="session-badge">
          <span class="label">SESSION</span>
          <span class="session-id">{{ sessionId ? sessionId.slice(0, 8).toUpperCase() : '--------' }}</span>
        </div>

        <!-- Recording status + timer -->
        <div class="status-block" :class="{ active: isActive }">
          <span class="status-dot" :class="{ pulse: isActive }"></span>
          <span class="status-text">{{ statusLabel }}</span>
          <span v-if="isActive" class="timer">{{ formattedTime }}</span>
        </div>

        <!-- Target language selector -->
        <div class="control-group">
          <label class="control-label">TARGET LANGUAGE</label>
          <select v-model="targetLanguage" class="lang-select" :disabled="isActive">
            <option v-for="lang in languages" :key="lang" :value="lang">{{ lang }}</option>
          </select>
        </div>

        <!-- ── TTS: Auto-read toggle ─────────────────────────────────────
          Sits directly below the language selector.
          When enabled, every new utterance is spoken aloud in the target
          language via the browser's SpeechSynthesis engine.
        ──────────────────────────────────────────────────────────────── -->
        <div class="control-group">
          <label class="control-label">VOICE OUTPUT</label>
          <button
            class="tts-toggle"
            :class="{ 'tts-toggle--on': autoRead }"
            @click="toggleAutoRead"
            :title="autoRead ? 'Click to mute voice output' : 'Click to enable voice output'"
          >
            <!-- Speaker icon: changes between on / off / speaking states -->
            <span class="tts-icon">
              <svg v-if="isSpeaking" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              <svg v-else-if="autoRead" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            </span>
            <span class="tts-label">
              {{ isSpeaking ? 'Speaking…' : autoRead ? 'Auto-read on' : 'Muted' }}
            </span>
            <!-- Live indicator dot when speaking -->
            <span v-if="isSpeaking" class="tts-live-dot"></span>
          </button>

          <!-- Warning shown if the target language has no installed voice -->
          <p v-if="autoRead && !voicesAvailable" class="tts-warning">
            Voices loading… speak to test.
          </p>
          <p v-if="autoRead && voicesAvailable && !hasVoiceForTarget" class="tts-warning">
            No {{ targetLanguage }} voice found. Using browser default.
          </p>
        </div>
        <!-- ── END TTS toggle ── -->

        <!-- ── HD Voice toggle ─────────────────────────────────────────
          Premium ElevenLabs voice mode. Only shown if server has it configured.
        ──────────────────────────────────────────────────────────────── -->
        <div v-if="hdAvailable" class="control-group">
          <label class="control-label">VOICE QUALITY</label>
          <button
            class="hd-toggle"
            :class="{ 'hd-toggle--on': hdMode, 'hd-toggle--loading': hdLoading }"
            @click="toggleHDMode"
            :title="hdMode ? 'Switch to Standard voice' : 'Switch to HD voice (ElevenLabs)'"
          >
            <span class="hd-icon">{{ hdLoading ? '⏳' : hdMode ? '💎' : '🔈' }}</span>
            <span class="hd-label">{{ hdLoading ? 'Loading HD…' : hdMode ? 'HD Voice' : 'Standard' }}</span>
            <span v-if="hdMode && !hdLoading" class="hd-badge">PRO</span>
          </button>
        </div>

        <!-- Start / Stop button -->
        <button
          class="session-btn"
          :class="{ 'session-btn--stop': isActive, 'session-btn--disabled': isSaving }"
          :disabled="isSaving"
          @click="handleSessionButton"
        >
          {{ sessionButtonLabel }}
        </button>

        <!-- Utterance count -->
        <div v-if="uttCount > 0" class="utt-count">
          {{ uttCount }} utterance{{ uttCount === 1 ? '' : 's' }} captured
        </div>

        <!-- ── Meeting Mode: Share button ──────────────────────────────
          Generates a shareable link that opens MeetingMode.vue
          in a new tab, joining this session's WebSocket room.
        ──────────────────────────────────────────────────────────────── -->
        <div v-if="isActive && sessionId" class="control-group">
          <label class="control-label">MEETING MODE</label>
          <button class="meeting-share-btn" @click="copyMeetingLink">
            <span class="meeting-share-icon">📡</span>
            <span class="meeting-share-label">{{ meetingCopied ? 'Link Copied!' : 'Share Live Captions' }}</span>
          </button>
          <p class="meeting-share-hint">
            Open in another tab to view live captions
          </p>
        </div>

      </aside>

      <!-- ── CENTER: Live transcript feed ──────────────────────────────── -->
      <main class="transcript-feed">

        <!-- Empty state -->
        <div v-if="utterances.length === 0" class="empty-feed">
          <div class="empty-orb"></div>
          <p class="empty-title">Awaiting transmission</p>
          <p class="empty-sub">Select a target language and press Start Session</p>
        </div>

        <!-- Utterance cards (newest first — unshift) -->
        <TransitionGroup name="utterance" tag="div" class="utterance-list">
          <div
            v-for="utt in utterances"
            :key="utt.id"
            class="utterance-card"
            :class="[`confidence-${confidenceTier(utt.confidence)}`, { 'is-speaking': speakingId === utt.id }]"
          >
            <!-- Card header: language badge + tone badge + confidence + speak button -->
            <div class="card-header">
              <span class="lang-badge">{{ utt.detectedLanguage?.toUpperCase() || '??' }}</span>
              <span v-if="utt.emotionalTone" class="tone-badge" :class="`tone-${utt.emotionalTone}`">
                {{ utt.emotionalTone }}
              </span>
              <span class="confidence-label">{{ utt.confidence ?? '—' }}%</span>

              <!-- ── TTS: Manual speak button on each card ───────────────
                Allows replaying any past utterance even when autoRead is off.
              ──────────────────────────────────────────────────────────── -->
              <button
                class="card-speak-btn"
                :class="{ 'card-speak-btn--active': speakingId === utt.id }"
                @click="speakUtterance(utt)"
                :title="`Read aloud in ${targetLanguage}`"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              </button>
              <!-- ── END card speak button ── -->
            </div>

            <!-- Original text -->
            <p class="text-original">{{ utt.textOriginal }}</p>

            <!-- Translated text with confidence heatmap -->
            <p class="text-translated" :class="`heatmap-${confidenceTier(utt.confidence)}`">
              <span class="heatmap-bar" :style="{ width: (utt.confidence ?? 0) + '%' }"></span>
              {{ utt.textTranslated }}
            </p>

            <!-- Alternative translations (DAI, shown when confidence < 72%) -->
            <div v-if="utt.alt1 || utt.alt2" class="alt-block">
              <span class="alt-label">ALTERNATIVES</span>
              <p v-if="utt.alt1" class="alt-text">{{ utt.alt1 }}</p>
              <p v-if="utt.alt2" class="alt-text">{{ utt.alt2 }}</p>
            </div>

            <span class="card-ts">{{ formatTimestamp(utt.timestamp) }}</span>
          </div>
        </TransitionGroup>

      </main>

      <!-- ── RIGHT: AI metrics sidebar ─────────────────────────────────── -->
      <aside class="metrics-panel">

        <!-- Detected language display -->
        <div class="metric-block">
          <span class="metric-label">DETECTED LANG</span>
          <span class="metric-value">{{ currentDetected }}</span>
        </div>

        <!-- Confidence score -->
        <div class="metric-block">
          <span class="metric-label">CONFIDENCE</span>
          <span class="metric-value">{{ currentConfidence }}</span>
        </div>

        <!-- ── Confidence Heatmap Legend ── -->
        <div class="metric-block">
          <span class="metric-label">HEATMAP</span>
          <div class="heatmap-legend">
            <div class="heatmap-legend-item">
              <span class="heatmap-swatch heatmap-swatch--high"></span>
              <span class="heatmap-legend-text">&ge;85%</span>
            </div>
            <div class="heatmap-legend-item">
              <span class="heatmap-swatch heatmap-swatch--medium"></span>
              <span class="heatmap-legend-text">65–84%</span>
            </div>
            <div class="heatmap-legend-item">
              <span class="heatmap-swatch heatmap-swatch--low"></span>
              <span class="heatmap-legend-text">&lt;65%</span>
            </div>
          </div>
        </div>

        <!-- ── TTS: Voice status metric ───────────────────────────────────
          Shows the BCP-47 code of the voice currently being used for TTS.
        ──────────────────────────────────────────────────────────────── -->
        <div class="metric-block">
          <span class="metric-label">VOICE</span>
          <span class="metric-value metric-value--sm">
            {{ autoRead ? (hdMode ? 'HD · ' : '') + (lastSpokenLang || resolvedVoiceLang) : 'MUTED' }}
          </span>
        </div>
        <!-- ── END voice metric ── -->

        <!-- Sync Strength (existing metric) -->
        <div class="metric-block">
          <span class="metric-label">SYNC STRENGTH</span>
          <div class="sync-bars">
            <span v-for="i in 5" :key="i" class="sync-bar" :class="{ active: syncStrength >= i }"></span>
          </div>
        </div>

        <!-- Model cards -->
        <div class="model-card">
          <span class="model-name">Whisper v3</span>
          <span class="model-status">STT + DETECT</span>
        </div>
        <div class="model-card">
          <span class="model-name">LLaMA 3.3</span>
          <span class="model-status">TRANSLATE + DAI</span>
        </div>
        <div class="model-card">
          <span class="model-name">Groq</span>
          <span class="model-status">INFERENCE</span>
        </div>

      </aside>

    </div>
    <!-- ══ END HUD ═══════════════════════════════════════════════════════ -->

  </div>
</template>

<script setup>
// ─────────────────────────────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────────────────────────────
import { ref, computed, watch, onUnmounted } from 'vue'
import JarvisOverlay from '@/components/JarvisOverlay.vue'
import { useSession } from '@/composables/useSession.js'
import { useTTS } from '@/composables/useTTS.js'   // ── TTS

// ─────────────────────────────────────────────────────────────────────────────
// Session composable — all existing state unchanged
// ─────────────────────────────────────────────────────────────────────────────
const {
  sessionState,
  sessionId,
  targetLanguage,
  utterances,
  sessionSeconds,
  currentDetected,
  currentConfidence,
  showJarvis,
  jarvisPhase,
  isActive,
  isSaving,
  uttCount,
  startSession,
  stopSession,
} = useSession()

// ─────────────────────────────────────────────────────────────────────────────
// ── TTS composable
// ─────────────────────────────────────────────────────────────────────────────
const {
  isSpeaking,
  autoRead,
  voicesAvailable,
  lastSpokenLang,
  hdMode,
  hdAvailable,
  hdLoading,
  speak,
  speakIfEnabled,
  stop: stopTTS,
  toggleAutoRead,
  toggleHDMode,
  getAvailableLangs,
} = useTTS()

// Track which utterance card is currently being spoken (for the highlight class)
const speakingId = ref(null)

// ─────────────────────────────────────────────────────────────────────────────
// Language options for the dropdown (same 15 as before)
// ─────────────────────────────────────────────────────────────────────────────
const languages = [
  'English', 'Hindi', 'Marathi', 'Spanish', 'French',
  'German', 'Japanese', 'Chinese', 'Arabic', 'Portuguese',
  'Russian', 'Korean', 'Italian', 'Tamil', 'Telugu',
  'Kannada', 'Gujarati', 'Bengali', 'Urdu',
]

// ─────────────────────────────────────────────────────────────────────────────
// Computed helpers
// ─────────────────────────────────────────────────────────────────────────────
const statusLabel = computed(() => {
  const map = {
    idle: 'STANDBY',
    starting: 'INITIALISING',
    active: 'RECORDING',
    stopping: 'STOPPING',
    saving: 'SAVING',
    saved: 'SESSION SAVED',
  }
  return map[sessionState.value] || 'STANDBY'
})

const sessionButtonLabel = computed(() => {
  if (isSaving.value) return 'Saving…'
  if (isActive.value) return 'Stop Session'
  if (sessionState.value === 'saved') return 'New Session'
  return 'Start Session'
})

const formattedTime = computed(() => {
  const s = sessionSeconds.value
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
})

// Sync strength: 1–5 bars derived from utterance count in this session
const syncStrength = computed(() => {
  const count = uttCount.value
  if (count === 0) return 0
  if (count < 3) return 1
  if (count < 6) return 2
  if (count < 10) return 3
  if (count < 15) return 4
  return 5
})

// Confidence tier for card border colour
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

// ── TTS: Whether the target language has a known voice installed
const resolvedVoiceLang = computed(() => {
  const map = {
    english: 'en-US', hindi: 'hi-IN', marathi: 'mr-IN', spanish: 'es-ES',
    french: 'fr-FR', german: 'de-DE', japanese: 'ja-JP', chinese: 'zh-CN',
    arabic: 'ar-SA', portuguese: 'pt-BR', russian: 'ru-RU', korean: 'ko-KR',
    italian: 'it-IT', tamil: 'ta-IN', telugu: 'te-IN', kannada: 'kn-IN',
    gujarati: 'gu-IN', bengali: 'bn-IN', urdu: 'ur-PK',
  }
  return map[targetLanguage.value?.toLowerCase()] || 'en-US'
})

const hasVoiceForTarget = computed(() => {
  const available = getAvailableLangs()
  const code = resolvedVoiceLang.value.split('-')[0]
  return available.includes(code)
})

// ─────────────────────────────────────────────────────────────────────────────
// Session button handler
// ─────────────────────────────────────────────────────────────────────────────
async function handleSessionButton() {
  if (isSaving.value) return
  if (isActive.value) {
    stopTTS()          // ── TTS: stop speaking when recording stops
    await stopSession()
  } else {
    await startSession()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Meeting Mode: copy shareable link
// ─────────────────────────────────────────────────────────────────────────────
const meetingCopied = ref(false)

function copyMeetingLink() {
  if (!sessionId.value) return
  const link = `${window.location.origin}/meeting/${sessionId.value}`
  navigator.clipboard.writeText(link).then(() => {
    meetingCopied.value = true
    setTimeout(() => { meetingCopied.value = false }, 2000)
  }).catch(() => {
    // Fallback: open in new tab if clipboard fails
    window.open(link, '_blank')
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// ── TTS: Watch for new utterances and auto-speak the latest one
//
// useSession.js does `utterances.value.unshift(...)` so the newest utterance
// is always at index 0. We watch the array length — when it grows, the item
// at index 0 is the one that was just added.
// ─────────────────────────────────────────────────────────────────────────────
watch(
  () => utterances.value.length,
  (newLen, oldLen) => {
    if (newLen <= oldLen) return              // session cleared — ignore
    const latest = utterances.value[0]
    if (!latest?.textTranslated) return      // no translated text yet

    // Update the speaking card highlight
    if (autoRead.value) speakingId.value = latest.id

    // Speak the translated text in the target language
    speakIfEnabled(
      latest.textTranslated,
      latest.detectedLanguage,   // Whisper code: 'mr', 'hi', 'en'…
      targetLanguage.value       // user selection: 'English', 'Hindi'…
    )
  }
)

// Clear the speakingId highlight when TTS finishes
watch(isSpeaking, (speaking) => {
  if (!speaking) speakingId.value = null
})

// ─────────────────────────────────────────────────────────────────────────────
// ── TTS: Manual speak button on each utterance card
// Speaks that specific card's translated text, regardless of autoRead state.
// ─────────────────────────────────────────────────────────────────────────────
function speakUtterance(utt) {
  if (!utt?.textTranslated) return
  speakingId.value = utt.id
  speak(utt.textTranslated, utt.detectedLanguage, targetLanguage.value)
}

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup on unmount
// ─────────────────────────────────────────────────────────────────────────────
onUnmounted(() => {
  stopTTS()  // ── TTS: cancel any in-progress speech when navigating away
})
</script>

<style scoped>
/* ─────────────────────────────────────────────────────────────────────────────
   Layout
──────────────────────────────────────────────────────────────────────────── */
.live-translate {
  min-height: 100vh;
  background: #0a0a0f;
  color: #e2e8f0;
  font-family: 'Inter', 'JetBrains Mono', monospace;
  padding: 1.5rem;
  position: relative;
}

.hud-layout {
  display: grid;
  grid-template-columns: 220px 1fr 200px;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Left panel
──────────────────────────────────────────────────────────────────────────── */
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-badge {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label, .control-label, .metric-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: #4a5568;
  font-weight: 600;
}

.session-id {
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  color: #63b3ed;
  letter-spacing: 0.06em;
}

.status-block {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #1a202c;
  border-radius: 8px;
  background: #0d1117;
}

.status-block.active {
  border-color: #2d4a2d;
  background: #0d1a0d;
}

.status-dot {
  width: 8px;
  height: 8px;
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

.status-text {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #a0aec0;
}

.timer {
  font-size: 11px;
  font-family: monospace;
  color: #48bb78;
  margin-left: auto;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lang-select {
  background: #0d1117;
  border: 1px solid #1a202c;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 13px;
  padding: 7px 10px;
  cursor: pointer;
  width: 100%;
}

.lang-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lang-select:focus {
  outline: none;
  border-color: #3182ce;
}

/* ── TTS toggle button ─────────────────────────────────────────────────────── */
.tts-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #1a202c;
  background: #0d1117;
  color: #4a5568;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.tts-toggle:hover {
  border-color: #2d3748;
  color: #a0aec0;
}

.tts-toggle--on {
  border-color: #2c5282;
  background: #0d1a2d;
  color: #63b3ed;
}

.tts-toggle--on:hover {
  border-color: #3182ce;
}

.tts-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.tts-label {
  flex: 1;
  text-align: left;
}

.tts-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #63b3ed;
  animation: pulse 0.8s ease-in-out infinite;
  flex-shrink: 0;
}

.tts-warning {
  font-size: 10px;
  color: #d69e2e;
  line-height: 1.4;
  margin-top: 2px;
}
/* ── END TTS toggle ─────────────────────────────────────────────────────── */

.session-btn {
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #2d4a2d;
  background: #0d1a0d;
  color: #68d391;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.session-btn:hover {
  background: #162416;
  border-color: #48bb78;
}

.session-btn--stop {
  border-color: #742a2a;
  background: #1a0d0d;
  color: #fc8181;
}

.session-btn--stop:hover {
  background: #2d1111;
  border-color: #fc8181;
}

.session-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.utt-count {
  font-size: 11px;
  color: #4a5568;
  text-align: center;
  letter-spacing: 0.04em;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Center: transcript feed
──────────────────────────────────────────────────────────────────────────── */
.transcript-feed {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
}

.empty-feed {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 4rem 2rem;
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

/* Transition animations for new cards entering */
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
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

/* Confidence tiers — left border colour */
.utterance-card.confidence-high   { border-left-color: #276749; }
.utterance-card.confidence-medium { border-left-color: #744210; }
.utterance-card.confidence-low    { border-left-color: #742a2a; }
.utterance-card.confidence-unknown { border-left-color: #2d3748; }

/* ── TTS: Highlight the card that is currently being spoken ── */
.utterance-card.is-speaking {
  box-shadow: 0 0 0 1px rgba(99, 179, 237, 0.35), 0 0 20px rgba(99, 179, 237, 0.08);
  border-left-color: #3182ce;
}

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

/* ── TTS: Card-level speak button ───────────────────────────────────────── */
.card-speak-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid #1a202c;
  background: transparent;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.card-speak-btn:hover {
  border-color: #3182ce;
  color: #63b3ed;
  background: #0d1a2d;
}

.card-speak-btn--active {
  border-color: #3182ce;
  color: #63b3ed;
  background: #0d1a2d;
  animation: speak-pulse 0.8s ease-in-out infinite;
}

@keyframes speak-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,179,237,0.0); }
  50%       { box-shadow: 0 0 0 3px rgba(99,179,237,0.25); }
}
/* ── END card speak button ── */

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
}

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

/* ─────────────────────────────────────────────────────────────────────────────
   Right panel: metrics
──────────────────────────────────────────────────────────────────────────── */
.metrics-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.metric-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: #63b3ed;
  font-family: monospace;
  letter-spacing: 0.04em;
}

.metric-value--sm {
  font-size: 12px;
  letter-spacing: 0.06em;
}

.sync-bars {
  display: flex;
  gap: 3px;
  margin-top: 4px;
}

.sync-bar {
  width: 8px;
  height: 16px;
  border-radius: 2px;
  background: #1a202c;
  transition: background 0.3s ease;
}

.sync-bar.active { background: #3182ce; }

.model-card {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #1a202c;
  background: #0d1117;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-name {
  font-size: 12px;
  font-weight: 600;
  color: #a0aec0;
  letter-spacing: 0.04em;
}

.model-status {
  font-size: 9px;
  letter-spacing: 0.1em;
  color: #4a5568;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Responsive — collapse to single column on mobile
──────────────────────────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .hud-layout {
    grid-template-columns: 1fr;
  }
  .metrics-panel {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .metric-block, .model-card {
    flex: 1 1 120px;
  }
}

/* ── HD Voice toggle ────────────────────────────────────────────────────── */
.hd-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #1a202c;
  background: #0d1117;
  color: #4a5568;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.hd-toggle:hover {
  border-color: #2d3748;
  color: #a0aec0;
}

.hd-toggle--on {
  border-color: #6b46c1;
  background: #1a0d2e;
  color: #b794f4;
}

.hd-toggle--on:hover {
  border-color: #805ad5;
}

.hd-toggle--loading {
  border-color: #6b46c1;
  background: #1a0d2e;
  color: #b794f4;
  animation: pulse 1s ease-in-out infinite;
}

.hd-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.hd-label {
  flex: 1;
  text-align: left;
}

.hd-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 1px 5px;
  border-radius: 3px;
  background: #6b46c1;
  color: #fff;
}
/* ── END HD Voice toggle ── */

/* ── Confidence Heatmap ─────────────────────────────────────────────────── */
.text-translated {
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
  transition: width 0.6s ease, background 0.3s ease;
  pointer-events: none;
}

.heatmap-high .heatmap-bar  { background: #48bb78; }
.heatmap-medium .heatmap-bar { background: #d69e2e; }
.heatmap-low .heatmap-bar   { background: #fc8181; }
.heatmap-unknown .heatmap-bar { background: #4a5568; }

/* Heatmap Legend */
.heatmap-legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.heatmap-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.heatmap-swatch {
  width: 14px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.heatmap-swatch--high   { background: #48bb78; }
.heatmap-swatch--medium { background: #d69e2e; }
.heatmap-swatch--low    { background: #fc8181; }

.heatmap-legend-text {
  font-size: 10px;
  color: #4a5568;
  letter-spacing: 0.04em;
}
/* ── END Confidence Heatmap ── */

/* ── Meeting Mode Share Button ──────────────────────────────────────────── */
.meeting-share-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #1a3a2a;
  background: #0d1a14;
  color: #48bb78;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.meeting-share-btn:hover {
  border-color: #48bb78;
  background: #0d2218;
}

.meeting-share-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.meeting-share-label {
  flex: 1;
  text-align: left;
}

.meeting-share-hint {
  font-size: 10px;
  color: #4a5568;
  line-height: 1.4;
  margin-top: 2px;
}
/* ── END Meeting Mode ── */
</style>
