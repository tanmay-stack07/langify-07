// client/src/composables/useTTS.js
//
// Universal text-to-speech composable for Langify.
// AUDIO ROUTING PRIORITY:
//   1. Google Cloud TTS via /api/tts/google (Neural2 voices, 35+ languages) ← PRIMARY
//   2. ElevenLabs Flash v2.5 via /api/tts/elevenlabs (if hdMode + key set)
//   3. Browser Web Speech API (last resort fallback only)
//
// This ensures Japanese, Chinese, Korean, Arabic etc. all have real audio output
// regardless of whether the OS has those voice packs installed.
//
// KEY PROBLEMS THIS SOLVES:
//   1. Chrome loads voices asynchronously — calling getVoices() on first render
//      returns [] on most browsers. We wait for 'voiceschanged' before caching.
//   2. Whisper returns language codes like 'hi', 'mr', 'en'. SpeechSynthesis
//      needs full BCP-47 codes like 'hi-IN', 'mr-IN', 'en-US'.
//   3. If a voice isn't installed, we fall back gracefully instead of crashing.
//   4. Chrome Android sometimes re-triggers 'voiceschanged' repeatedly — we
//      guard against multiple initializations.
//   5. Long translated sentences can be cut off by Chrome's 15-second TTS bug.
//      We chunk text at sentence boundaries before speaking.

import { ref, readonly } from 'vue'
import { API_BASE } from '@/config/api.js'

// ─────────────────────────────────────────────────────────────────────────────
// Language code map: Whisper output codes → BCP-47 for SpeechSynthesis
// Whisper returns 2-letter ISO 639-1 codes (hi, mr, en, es…)
// SpeechSynthesis needs full IETF language tags (hi-IN, mr-IN, en-US…)
// ─────────────────────────────────────────────────────────────────────────────
const LANG_MAP = {
  // Indian languages
  mr: 'mr-IN', // Marathi
  hi: 'hi-IN', // Hindi
  ta: 'ta-IN', // Tamil
  te: 'te-IN', // Telugu
  kn: 'kn-IN', // Kannada
  ml: 'ml-IN', // Malayalam
  gu: 'gu-IN', // Gujarati
  bn: 'bn-IN', // Bengali
  pa: 'pa-IN', // Punjabi
  or: 'or-IN', // Odia
  ur: 'ur-PK', // Urdu

  // International
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
  nl: 'nl-NL',
  ru: 'ru-RU',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ko: 'ko-KR',
  ar: 'ar-SA',
  tr: 'tr-TR',
  pl: 'pl-PL',
  sv: 'sv-SE',
  da: 'da-DK',
  fi: 'fi-FI',
  nb: 'nb-NO',
  id: 'id-ID',
  ms: 'ms-MY',
  vi: 'vi-VN',
  th: 'th-TH',
  uk: 'uk-UA',
  cs: 'cs-CZ',
  ro: 'ro-RO',
  hu: 'hu-HU',
  el: 'el-GR',
  he: 'he-IL',
  fa: 'fa-IR',
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level voice cache — shared across all composable instances.
// We only register the 'voiceschanged' listener once.
// ─────────────────────────────────────────────────────────────────────────────
let voiceCache = []
let voicesLoaded = false
let voicesLoadedCallbacks = []

function onVoicesReady(cb) {
  if (voicesLoaded) { cb(voiceCache); return }
  voicesLoadedCallbacks.push(cb)
}

function initVoiceCache() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  const synth = window.speechSynthesis

  function load() {
    const voices = synth.getVoices()
    if (voices.length === 0) return // not ready yet — wait for event

    voiceCache = voices
    voicesLoaded = true

    // Drain pending callbacks
    voicesLoadedCallbacks.forEach(cb => cb(voiceCache))
    voicesLoadedCallbacks = []
  }

  // Try immediately — works on Firefox and some Safari builds
  load()

  // Chrome fires 'voiceschanged' asynchronously
  synth.addEventListener('voiceschanged', load, { once: false })
}

// Initialize once at module load time
initVoiceCache()

// ─────────────────────────────────────────────────────────────────────────────
// Voice selection strategy:
//   1. Exact BCP-47 match         → 'mr-IN'
//   2. Language prefix match      → any voice whose lang starts with 'mr'
//   3. null (let browser decide)  → browser uses its default for the lang
//
// We prefer non-local (Google/remote) voices because they typically have
// better Indian language support than local OS voices.
// ─────────────────────────────────────────────────────────────────────────────
function selectVoice(bcp47Code) {
  if (!voiceCache.length) return null

  const exact = voiceCache.find(v => v.lang === bcp47Code)
  if (exact) return exact

  const prefix = bcp47Code.split('-')[0]
  // Prefer remote voices (Google voices on Chrome) for Indian languages
  const remoteMatch = voiceCache.find(
    v => v.lang.startsWith(prefix) && !v.localService
  )
  if (remoteMatch) return remoteMatch

  const anyMatch = voiceCache.find(v => v.lang.startsWith(prefix))
  return anyMatch || null
}

// ─────────────────────────────────────────────────────────────────────────────
// Chrome TTS bug: utterances over ~200 characters or ~15 seconds get silently
// cut off. We split at sentence boundaries so each chunk is short enough.
// ─────────────────────────────────────────────────────────────────────────────
function splitIntoChunks(text, maxLen = 200) {
  if (text.length <= maxLen) return [text]

  // Split on sentence-ending punctuation, keeping the delimiter
  const sentences = text.match(/[^।.!?]+[।.!?]*/g) || [text]
  const chunks = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current.length > 0) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

// ─────────────────────────────────────────────────────────────────────────────
// The composable
// ─────────────────────────────────────────────────────────────────────────────
export function useTTS() {
  // Guard: SSR / non-browser environments
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const synth = supported ? window.speechSynthesis : null

  // ── Reactive state exposed to the component ──────────────────────────────
  const isSpeaking = ref(false)
  const autoRead = ref(false)       // toggled by the UI button
  const voicesAvailable = ref(voicesLoaded)
  const lastSpokenLang = ref(null)  // useful for showing in HUD

  // ── HD Voice (ElevenLabs) state ──────────────────────────────────────────
  const hdMode = ref(false)         // user toggle: standard vs HD
  const hdAvailable = ref(false)    // probed from server on init
  const hdLoading = ref(false)      // true while waiting for ElevenLabs audio
  let currentAudio = null           // HTMLAudioElement for HD playback

  // ── API base URL (from shared config) ─────────────────────────────────
  // Imported at top of file from @/config/api.js

  // Probe server to see if ElevenLabs is configured
  async function probeHD() {
    try {
      const res = await fetch(`${API_BASE}/api/tts/elevenlabs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      })
      // 501 = not configured, anything else = configured (even 400/429)
      hdAvailable.value = res.status !== 501
    } catch {
      hdAvailable.value = false
    }
  }
  // Fire probe asynchronously — doesn't block composable init
  if (typeof window !== 'undefined') probeHD()

  // Update voicesAvailable when voices load (for components that render before load)
  if (!voicesLoaded) {
    onVoicesReady(() => { voicesAvailable.value = true })
  }

  // ── Target language name → BCP-47 code resolver ──────────────────────────
  const targetToCode = {
    english: 'en', hindi: 'hi', marathi: 'mr', spanish: 'es',
    french: 'fr', german: 'de', japanese: 'ja', chinese: 'zh',
    arabic: 'ar', portuguese: 'pt', russian: 'ru', korean: 'ko',
    italian: 'it', tamil: 'ta', telugu: 'te', kannada: 'kn',
    gujarati: 'gu', bengali: 'bn', urdu: 'ur',
  }

  function resolveBCP47(whisperCode, targetLangName) {
    const normalised = targetLangName?.toLowerCase().trim() || ''
    const resolvedCode = targetToCode[normalised] || whisperCode || 'en'
    return LANG_MAP[resolvedCode] || 'en-US'
  }

  // ── HD Voice speak (ElevenLabs via server proxy) ─────────────────────────
  async function speakHD(text, bcp47) {
    if (!text?.trim()) return
    hdLoading.value = true
    isSpeaking.value = true

    try {
      const res = await fetch(`${API_BASE}/api/tts/elevenlabs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          languageCode: bcp47,
        }),
      })

      if (!res.ok) {
        console.warn('[useTTS] HD Voice failed, falling back to standard:', res.status)
        hdLoading.value = false
        speakStandard(text, bcp47)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      // Stop any previous HD audio
      if (currentAudio) {
        currentAudio.pause()
        currentAudio = null
      }

      currentAudio = new Audio(url)
      currentAudio.onplay = () => { hdLoading.value = false }
      currentAudio.onended = () => {
        isSpeaking.value = false
        URL.revokeObjectURL(url)
        currentAudio = null
      }
      currentAudio.onerror = () => {
        console.warn('[useTTS] HD audio playback error, falling back to standard')
        isSpeaking.value = false
        hdLoading.value = false
        URL.revokeObjectURL(url)
        currentAudio = null
        speakStandard(text, bcp47)
      }
      currentAudio.play()

    } catch (err) {
      console.warn('[useTTS] HD Voice network error, falling back to standard:', err)
      hdLoading.value = false
      speakStandard(text, bcp47)
    }
  }

  // ── Standard speak (Web Speech API) ──────────────────────────────────────
  function speakStandard(text, bcp47) {
    if (!supported || !text?.trim()) return

    synth.cancel()
    const chunks = splitIntoChunks(text)

    function speakChunk(index) {
      if (index >= chunks.length) {
        isSpeaking.value = false
        return
      }

      const utt = new SpeechSynthesisUtterance(chunks[index])
      utt.lang = bcp47
      utt.rate = 0.92   // slightly slower — clearer for non-native listeners
      utt.pitch = 1.0
      utt.volume = 1.0

      const voice = selectVoice(bcp47)
      if (voice) utt.voice = voice

      utt.onstart = () => { isSpeaking.value = true }
      utt.onend = () => speakChunk(index + 1)
      utt.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('[useTTS] SpeechSynthesisUtterance error:', e.error)
        }
        isSpeaking.value = false
      }

      synth.speak(utt)
    }

    speakChunk(0)
  }

  // ── Google Cloud TTS speak (via server — works for ALL languages) ────────
  async function speakGoogle(text, language) {
    if (!text?.trim()) return
    isSpeaking.value = true

    try {
      const res = await fetch(`${API_BASE}/api/tts/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      })

      if (!res.ok) throw new Error(`Server TTS failed: ${res.status}`)

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      if (currentAudio) { currentAudio.pause(); currentAudio = null }

      currentAudio = new Audio(url)
      currentAudio.onended = () => {
        isSpeaking.value = false
        URL.revokeObjectURL(url)
        currentAudio = null
      }
      currentAudio.onerror = () => {
        console.warn('[useTTS] Google audio playback error, falling back to Web Speech')
        isSpeaking.value = false
        URL.revokeObjectURL(url)
        currentAudio = null
        speakStandard(text, LANG_MAP[language] || language || 'en-US')
      }
      currentAudio.play()

    } catch (err) {
      console.warn('[useTTS] Google TTS failed, falling back to Web Speech:', err.message)
      isSpeaking.value = false
      speakStandard(text, LANG_MAP[language] || language || 'en-US')
    }
  }

  // ── Public speak() — Google TTS primary, ElevenLabs HD optional, Web Speech fallback
  function speak(text, whisperCode, targetLangName) {
    if (!text?.trim()) return

    const bcp47 = resolveBCP47(whisperCode, targetLangName)
    // Resolve the short language code for Google TTS (e.g. 'ja', 'zh', 'hi')
    const normalised = targetLangName?.toLowerCase().trim() || ''
    const shortCode = targetToCode[normalised] || whisperCode || 'en'
    lastSpokenLang.value = bcp47

    stop()

    if (hdMode.value && hdAvailable.value) {
      speakHD(text, bcp47);
    } else {
      // Prioritize Google Cloud TTS (Server Proxy) for all languages
      speakGoogle(text, shortCode);
    }
  }

  // ── Convenience: speak only if autoRead is on ─────────────────────────────
  function speakIfEnabled(text, whisperCode, targetLangName) {
    if (autoRead.value) {
      speak(text, whisperCode, targetLangName)
    }
  }

  // ── stop() ───────────────────────────────────────────────────────────────
  function stop() {
    if (supported) synth.cancel()
    if (currentAudio) {
      currentAudio.pause()
      currentAudio = null
    }
    isSpeaking.value = false
    hdLoading.value = false
  }

  // ── toggle() ─────────────────────────────────────────────────────────────
  function toggleAutoRead() {
    autoRead.value = !autoRead.value
    if (!autoRead.value) stop()
  }

  function toggleHDMode() {
    hdMode.value = !hdMode.value
    // If turning off HD while speaking, stop and let next utterance use standard
    if (!hdMode.value && currentAudio) stop()
  }

  // ── getAvailableLangs() — useful for debug / settings page ───────────────
  function getAvailableLangs() {
    const prefixes = Object.keys(LANG_MAP)
    return prefixes.filter(code => selectVoice(LANG_MAP[code]) !== null)
  }

  return {
    // State
    isSpeaking: readonly(isSpeaking),
    autoRead,                          // writable ref — v-model compatible
    voicesAvailable: readonly(voicesAvailable),
    lastSpokenLang: readonly(lastSpokenLang),

    // HD Voice state
    hdMode,                            // writable ref — v-model compatible
    hdAvailable: readonly(hdAvailable),
    hdLoading: readonly(hdLoading),

    // Methods
    speak,
    speakIfEnabled,
    stop,
    toggleAutoRead,
    toggleHDMode,
    getAvailableLangs,
  }
}
