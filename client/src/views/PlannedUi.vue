<script setup>
import axios from 'axios';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useMediaRecorder } from '../composables/useMediaRecorder';
import { useSession } from '../composables/useSession';
import { useTTS } from '../composables/useTTS';
import { API_BASE } from '@/config/api.js';
import AppSelect from '../components/ui/AppSelect.vue';

const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'upload', label: 'Upload File' },
  { id: 'record', label: 'Record Audio' },
  { id: 'translate', label: 'Live Translate' },
  { id: 'history', label: 'History' },
  { id: 'about', label: 'About' }
];

const featureCards = [
  {
    title: 'Auto Detection',
    text: 'Speech input is detected automatically so users can jump in without setup.',
    icon: 'A'
  },
  {
    title: 'Text Conversion',
    text: 'Audio becomes structured text that can be reviewed, copied, and exported.',
    icon: 'T'
  },
  {
    title: 'AI Conversation',
    text: 'Translation cards are laid out for real-time multilingual communication.',
    icon: 'AI'
  }
];

const pipelineSteps = [
  { title: 'Analyzing', caption: 'Waveform intake and language signal scan' },
  { title: 'Processing', caption: 'Chunk cleanup and transcript assembly' },
  { title: 'Translating', caption: 'Semantic conversion into target language' }
];

const outputLanguages = [
  'English',
  'Hindi',
  'Spanish',
  'French',
  'German',
  'Tamil',
  'Japanese',
  'Arabic'
];

const speechLanguageCodes = {
  English: 'en-US',
  Hindi: 'hi-IN',
  Spanish: 'es-ES',
  French: 'fr-FR',
  German: 'de-DE',
  Tamil: 'ta-IN',
  Japanese: 'ja-JP',
  Arabic: 'ar-SA'
};

const transcriptFormats = [
  { value: 'verbose_json', label: 'Verbose JSON' },
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Plain Text' }
];

const supportedFormats = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'ogg', 'opus', 'wav', 'webm', 'flac'];

const router = useRouter();
const { currentUser, logout } = useAuth();
const { isRecording, startRecording, stopRecording, selectedDeviceId, audioDevices, getAudioDevices, setMuted } = useMediaRecorder();
const {
  speak: speakWithTTS,
  stop: stopTTS,
  isSpeaking: isTtsSpeaking,
  hdMode,
  hdAvailable,
  hdLoading,
  speak,
  speakIfEnabled,
  autoRead,
  toggleAutoRead,
  isSpeaking
} = useTTS();

const {
  sessionId,
  utterances,
  isProcessing,
  targetLanguage,
  createSession,
  processAudioChunk
} = useSession();

// Enable voice output by default (autoRead starts false in the composable)
autoRead.value = true;

const activeTab = ref('home');
const selectedOutputLanguage = ref('English');
const isLiveSessionRunning = ref(false);
const liveError = ref('');
const transcriptEl = ref(null);

const selectedFile = ref(null);
const fileInput = ref(null);
const fileName = ref('');
const fileSize = ref('');
const isDragging = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const transcription = ref(null);
const uploadError = ref('');
const outputFormat = ref('text');
const uploadOutputLanguage = ref('English');

const sessions = ref([]);
const isHistoryLoading = ref(false);
const historyError = ref('');
const expandedSession = ref(null);
const sessionUtterances = ref({});
const uploadLanguageMap = {
  en: 'English',
  hi: 'Hindi',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ta: 'Tamil',
  ja: 'Japanese',
  ar: 'Arabic'
};

const currentTab = computed(() => tabs.find((tab) => tab.id === activeTab.value));
const currentUserLabel = computed(() => currentUser.value?.name || currentUser.value?.email || 'Signed in');
const transcriptText = computed(() => {
  if (!transcription.value) return '';
  if (transcription.value.translatedText) return transcription.value.translatedText;

  const payload = transcription.value.transcription ?? transcription.value;
  if (typeof payload === 'string') return payload;
  return payload.text || JSON.stringify(payload, null, 2);
});

const uploadDetectedLanguage = computed(() => {
  if (!transcription.value) return 'Auto-detect';
  const code = transcription.value.detectedLanguage || transcription.value.transcription?.language || '';
  return uploadLanguageMap[String(code).toLowerCase()] || code || 'Auto-detect';
});

const uploadTranscriptToSpeak = computed(() => {
  const translatedText = transcription.value?.translatedText;
  return typeof translatedText === 'string' ? translatedText.trim() : '';
});

watch(selectedOutputLanguage, (value) => {
  targetLanguage.value = value;
}, { immediate: true });

const handleReflectiveMove = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  event.currentTarget.style.setProperty('--mx', `${x}%`);
  event.currentTarget.style.setProperty('--my', `${y}%`);
};

const resetReflectiveMove = (event) => {
  event.currentTarget.style.removeProperty('--mx');
  event.currentTarget.style.removeProperty('--my');
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const setFile = (file) => {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (!supportedFormats.includes(ext)) {
    uploadError.value = `Unsupported format ".${ext}". Supported: ${supportedFormats.join(', ')}`;
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    uploadError.value = 'File too large. Maximum size is 25MB.';
    return;
  }

  selectedFile.value = file;
  fileName.value = file.name;
  fileSize.value = formatBytes(file.size);
  uploadError.value = '';
  transcription.value = null;
};

const handleFileSelect = (event) => {
  const file = event.target.files?.[0];
  if (file) setFile(file);
};

const handleDrop = (event) => {
  isDragging.value = false;
  const file = event.dataTransfer.files?.[0];
  if (file) setFile(file);
};

const clearFile = () => {
  stopUploadPlayback();
  selectedFile.value = null;
  fileName.value = '';
  fileSize.value = '';
  transcription.value = null;
  uploadError.value = '';

  if (fileInput.value) fileInput.value.value = '';
};

const uploadFile = async () => {
  if (!selectedFile.value) return;

  const formData = new FormData();
  formData.append('audio', selectedFile.value);
  formData.append('targetLanguage', uploadOutputLanguage.value);

  isUploading.value = true;
  uploadProgress.value = 0;
  uploadError.value = '';
  stopUploadPlayback();
  transcription.value = null;

  try {
    const response = await axios.post(`${API_BASE}/api/transcribe?format=${outputFormat.value}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        uploadProgress.value = Math.round((event.loaded * 100) / event.total);
      }
    });

    transcription.value = response.data;
  } catch (error) {
    const errorCode = error.response?.data?.errorCode;
    const providerMessage = error.response?.data?.providerMessage;
    if (errorCode === 'AI_PROVIDER_ACCESS_DENIED') {
      uploadError.value = `Speech-to-text provider blocked the request. ${providerMessage || 'Disable VPN / proxy or change network and try again.'}`;
    } else {
      uploadError.value = error.response?.data?.error || 'Upload failed. Please try again.';
    }
  } finally {
    isUploading.value = false;
  }
};

const startLiveSession = async () => {
  liveError.value = '';
  targetLanguage.value = selectedOutputLanguage.value;

  try {
    await createSession();
    await startRecording(async (blob) => {
      let result;

      try {
        result = await processAudioChunk(blob);
      } catch (error) {
        const providerMessage = error.response?.data?.providerMessage;
        const errorCode = error.response?.data?.errorCode;

        if (errorCode === 'AI_PROVIDER_ACCESS_DENIED') {
          liveError.value = `Live translation is blocked by the AI provider right now: ${providerMessage}`;
        } else {
          liveError.value = error.response?.data?.error || 'Live translation failed while processing audio.';
        }

        stopLiveSession();
        return;
      }

      if (result?.translatedText) {
        speakTranslatedText(result.translatedText, result.originalText);
      }

      await nextTick();

      if (transcriptEl.value) {
        transcriptEl.value.scrollTop = transcriptEl.value.scrollHeight;
      }
    });

    isLiveSessionRunning.value = true;
    activeTab.value = 'translate';
  } catch {
    liveError.value = 'Microphone access or live translation start failed.';
    isLiveSessionRunning.value = false;
  }
};

const stopLiveSession = () => {
  stopRecording();
  isLiveSessionRunning.value = false;
  stopTTS(); // Stop any in-progress Google TTS / ElevenLabs / Web Speech
};

const speakTranslatedText = (text, originalText) => {
  if (!text) return;

  const normalizedText = (text || '').trim().toLowerCase();
  const normalizedOriginal = (originalText || '').trim().toLowerCase();

  if (!normalizedText || (normalizedOriginal && normalizedText === normalizedOriginal)) {
    return;
  }

  // Routes through Google Cloud TTS (Neural2/WaveNet voices for all languages)
  // speakIfEnabled checks autoRead internally
  speakIfEnabled(text, null, selectedOutputLanguage.value);
};

const stopUploadPlayback = () => {
  stopTTS();
};

const toggleUploadPlayback = () => {
  const text = uploadTranscriptToSpeak.value;
  if (!text) return;

  if (isTtsSpeaking.value || hdLoading.value) {
    stopUploadPlayback();
    return;
  }

  speakWithTTS(text, undefined, uploadOutputLanguage.value);
};

const loadSessions = async () => {
  isHistoryLoading.value = true;
  historyError.value = '';

  try {
    const response = await axios.get(`${API_BASE}/api/sessions`);
    sessions.value = response.data.sessions || [];
  } catch {
    sessions.value = [];
    historyError.value = '';
  } finally {
    isHistoryLoading.value = false;
  }
};

const toggleSession = async (sessionIdValue) => {
  if (expandedSession.value === sessionIdValue) {
    expandedSession.value = null;
    return;
  }

  expandedSession.value = sessionIdValue;

  if (!sessionUtterances.value[sessionIdValue]) {
    try {
      const response = await axios.get(`${API_BASE}/api/sessions/${sessionIdValue}/utterances`);
      sessionUtterances.value[sessionIdValue] = response.data.utterances || [];
    } catch {
      sessionUtterances.value[sessionIdValue] = [];
    }
  }
};

const goToAuth = () => {
  router.push('/auth');
};

const signOut = async () => {
  await logout();
  router.push('/auth');
};

watch(activeTab, (tab) => {
  if (tab === 'history') loadSessions();
});

watch(isSpeaking, (speaking) => {
  setMuted(speaking);
});

onMounted(async () => {
  targetLanguage.value = selectedOutputLanguage.value;
  await getAudioDevices();
});
</script>

<template>
  <div class="planned-ui min-h-screen text-white">
    <div class="planned-ui__bg"></div>
    <div class="planned-ui__glow planned-ui__glow--left"></div>
    <div class="planned-ui__glow planned-ui__glow--right"></div>

    <main class="relative z-10 px-4 py-6 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <section class="planned-shell">
          <header class="planned-topbar">
            <div class="planned-brand">
              <div class="planned-brand__mark">L</div>
              <div class="planned-brand__text">
                <p class="planned-brand__name">
                  <span class="planned-brand__lang">Lang</span><span class="planned-brand__ify">ify</span>
                </p>
                <p class="planned-brand__sub">Universal language workspace</p>
              </div>
            </div>

            <nav class="planned-nav">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                type="button"
                class="planned-nav__item"
                :class="{ 'planned-nav__item--active': activeTab === tab.id }"
                @click="activeTab = tab.id"
                @mousemove="handleReflectiveMove"
                @mouseleave="resetReflectiveMove"
              >
                {{ tab.label }}
              </button>
            </nav>

            <div class="planned-actions">
              <div class="planned-current-tab">{{ currentTab?.label }}</div>
              <div class="planned-user-pill">{{ currentUserLabel }}</div>
              <button
                type="button"
                class="planned-btn planned-btn--ghost"
                @click="goToAuth"
                @mousemove="handleReflectiveMove"
                @mouseleave="resetReflectiveMove"
              >
                Account
              </button>
              <button
                type="button"
                class="planned-btn planned-btn--primary"
                @click="signOut"
                @mousemove="handleReflectiveMove"
                @mouseleave="resetReflectiveMove"
              >
                Sign Out
              </button>
            </div>
          </header>

          <section v-if="activeTab === 'home'" class="planned-section-stack">
            <div class="planned-hero">
              <div class="planned-hero__copy">
                <p class="planned-kicker">Your voice. Any language. Instant text.</p>
                <h1>Break down language barriers and connect with the world.</h1>
                <p class="planned-copy">
                  This new screen is the visual direction for the app. We can now plug real upload,
                  record, translate, and history features into these panels.
                </p>

                <div class="planned-hero__actions">
                  <button
                    type="button"
                    class="planned-btn planned-btn--primary"
                    @click="activeTab = 'translate'"
                    @mousemove="handleReflectiveMove"
                    @mouseleave="resetReflectiveMove"
                  >
                    Start Translating
                  </button>
                  <button
                    type="button"
                    class="planned-btn planned-btn--ghost"
                    @click="activeTab = 'upload'"
                    @mousemove="handleReflectiveMove"
                    @mouseleave="resetReflectiveMove"
                  >
                    Upload Audio
                  </button>
                </div>
              </div>

              <div class="planned-hero__signal">
                <div class="planned-wave">
                  <span v-for="bar in 16" :key="bar" :style="{ animationDelay: `${bar * 0.08}s` }"></span>
                </div>
                <div class="planned-hero__meta">
                  <span>Realtime Speech</span>
                  <span>33 Languages</span>
                  <span>Low-latency Output</span>
                </div>
              </div>
            </div>

            <div class="planned-panel">
              <div class="planned-panel__header">
                <h2>Our Key Features</h2>
                <p>Built as card regions so we can swap in live data later.</p>
              </div>

              <div class="planned-feature-grid">
                <article v-for="feature in featureCards" :key="feature.title" class="planned-card">
                  <div class="planned-card__icon">{{ feature.icon }}</div>
                  <h3>{{ feature.title }}</h3>
                  <p>{{ feature.text }}</p>
                </article>
              </div>
            </div>

            <div class="planned-language-strip">
              <span>Japanese</span>
              <span>English</span>
              <span>German</span>
              <span>Italian</span>
              <span>Arabic</span>
              <span>French</span>
              <span>Tamil</span>
              <span>Spanish</span>
            </div>
          </section>

          <section v-else-if="activeTab === 'upload'" class="planned-section-stack planned-section-stack--airy">
            <div class="planned-panel planned-panel--wide">
              <div class="planned-panel__header centered">
                <h2>Upload Your File</h2>
                <p>Upload audio, let Langify auto-detect the input language, and choose the output language you want to read.</p>
              </div>

              <div
                class="planned-dropzone"
                :class="{ 'planned-dropzone--dragging': isDragging }"
                @dragover.prevent="isDragging = true"
                @dragleave="isDragging = false"
                @drop.prevent="handleDrop"
              >
                <input
                  ref="fileInput"
                  type="file"
                  class="planned-hidden-input"
                  :accept="supportedFormats.map((format) => `.${format}`).join(',')"
                  @change="handleFileSelect"
                />
                <p>Drag &amp; drop your file here or <button type="button" class="planned-inline-link" @click="fileInput?.click()">Browse</button></p>
                <div class="planned-chip-row">
                  <span v-for="format in supportedFormats.slice(0, 6)" :key="format" class="planned-chip">
                    {{ format }}
                  </span>
                </div>
              </div>

              <div v-if="selectedFile" class="planned-file-meta">
                <div>
                  <p class="planned-file-meta__name">{{ fileName }}</p>
                  <span>{{ fileSize }}</span>
                </div>
                <button type="button" class="planned-btn planned-btn--ghost" @click="clearFile">Clear</button>
              </div>

              <div class="planned-upload-controls">
                <label class="planned-live-field planned-live-field--compact">
                  <span>Output language</span>
                  <AppSelect v-model="uploadOutputLanguage" :options="outputLanguages" />
                  <!-- legacy select block removed in favor of AppSelect
                    <button
                      type="button"
                      class="planned-select__trigger"
                      @click="toggleUploadDropdown('language')"
                    >
                      <span>{{ uploadOutputLanguage }}</span>
                      <span class="planned-select__chevron">⌄</span>
                    </button>

                    <transition name="planned-select-menu">
                      <div v-if="isUploadLanguageOpen" class="planned-select__menu">
                        <button
                          v-for="lang in outputLanguages"
                          :key="lang"
                          type="button"
                          class="planned-select__option"
                          :class="{ 'planned-select__option--active': uploadOutputLanguage === lang }"
                          @click="selectUploadLanguage(lang)"
                        >
                          {{ lang }}
                        </button>
                      </div>
                    </transition>
                  </div>
                  -->
                </label>

                <label class="planned-live-field planned-live-field--compact">
                  <span>Transcript format</span>
                  <AppSelect v-model="outputFormat" :options="transcriptFormats" />
                  <!-- legacy select block removed in favor of AppSelect
                    <button
                      type="button"
                      class="planned-select__trigger"
                      @click="toggleUploadDropdown('format')"
                    >
                      <span>{{ transcriptFormats.find((format) => format.value === outputFormat)?.label || 'Plain Text' }}</span>
                      <span class="planned-select__chevron">⌄</span>
                    </button>

                    <transition name="planned-select-menu">
                      <div v-if="isUploadFormatOpen" class="planned-select__menu">
                        <button
                          v-for="format in transcriptFormats"
                          :key="format.value"
                          type="button"
                          class="planned-select__option"
                          :class="{ 'planned-select__option--active': outputFormat === format.value }"
                          @click="selectUploadFormat(format.value)"
                        >
                          {{ format.label }}
                        </button>
                      </div>
                    </transition>
                  </div>
                  -->
                </label>

                <button
                  type="button"
                  class="planned-btn planned-btn--primary"
                  :disabled="!selectedFile || isUploading"
                  @click="uploadFile"
                  @mousemove="handleReflectiveMove"
                  @mouseleave="resetReflectiveMove"
                >
                  {{ isUploading ? 'Processing...' : 'Transcribe + Translate' }}
                </button>
              </div>

              <div v-if="isUploading" class="planned-progress">
                <div class="planned-progress__bar">
                  <span :style="{ width: `${uploadProgress}%` }"></span>
                </div>
                <p>{{ uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Processing with Whisper...' }}</p>
              </div>

              <p v-if="uploadError" class="planned-alert planned-alert--error">{{ uploadError }}</p>
            </div>

            <div class="planned-panel planned-panel--wide">
              <div class="planned-panel__header centered">
                <h2>Transcript Result</h2>
                <p>As soon as the backend responds, the returned transcript shows up here.</p>
              </div>

              <div class="planned-process-grid">
                <article v-for="step in pipelineSteps" :key="step.title" class="planned-process-card">
                  <div class="planned-process-card__visual"></div>
                  <h3>{{ step.title }}</h3>
                  <p>{{ step.caption }}</p>
                </article>
              </div>

              <div class="planned-transcript-output">
                <p v-if="!transcription" class="planned-empty-copy">
                  Choose a file and Langify will auto-detect the input language and show the output in your selected language here.
                </p>
                <template v-else>
                  <div class="planned-result-meta">
                    <span>Detected input: {{ uploadDetectedLanguage }}</span>
                    <span>Output: {{ uploadOutputLanguage }}</span>
                  </div>
                  <div v-if="transcription.originalText && transcription.translatedText" class="planned-result-block">
                    <h3>Original transcript</h3>
                    <p>{{ transcription.originalText }}</p>
                  </div>
                  <div v-if="transcription.translatedText" class="planned-result-block planned-result-block--translated">
                    <div class="planned-result-block__head">
                      <h3>Translated output</h3>
                      <button
                        type="button"
                        class="planned-result-listen"
                        @click="toggleUploadPlayback"
                      >
                        {{ hdLoading ? 'Loading audio' : (isTtsSpeaking ? 'Stop audio' : (hdAvailable ? 'Listen audio' : 'Listen audio')) }}
                      </button>
                    </div>
                  </div>
                  <pre>{{ transcriptText }}</pre>
                </template>
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'record'" class="planned-section-stack planned-section-stack--airy">
            <div class="planned-panel centered-panel">
              <div class="planned-panel__header centered">
                <h2>Record Audio</h2>
                <p>We are keeping record and live translate together for now so the actual real-time flow stays simple.</p>
              </div>

              <div class="planned-recorder">
                <div class="planned-recorder__orb"></div>
                <div class="planned-wave planned-wave--compact">
                  <span v-for="bar in 12" :key="bar" :style="{ animationDelay: `${bar * 0.06}s` }"></span>
                </div>
                <div class="planned-recorder__actions">
                  <button
                    type="button"
                    class="planned-btn planned-btn--primary"
                    @click="activeTab = 'translate'"
                    @mousemove="handleReflectiveMove"
                    @mouseleave="resetReflectiveMove"
                  >
                    Open Live Translate
                  </button>
                  <button
                    type="button"
                    class="planned-btn planned-btn--ghost"
                    @click="activeTab = 'upload'"
                    @mousemove="handleReflectiveMove"
                    @mouseleave="resetReflectiveMove"
                  >
                    Use File Upload
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'translate'" class="planned-section-stack planned-section-stack--airy">
            <div class="planned-panel">
              <div class="planned-panel__header planned-panel__header--split">
                <div>
                  <p class="planned-kicker">Live translate</p>
                  <h2>Start a simple live translation session</h2>
                  <p>
                    Input language will be detected automatically. Just choose the output language,
                    start the session, and stop when you are done.
                  </p>
                </div>

                <div class="planned-live-status" :class="{ 'planned-live-status--active': isLiveSessionRunning }">
                  <span class="planned-live-status__dot"></span>
                  <span>{{ isLiveSessionRunning ? 'Session running' : 'Ready to start' }}</span>
                </div>
              </div>

              <div class="planned-live-grid">
                <article class="planned-live-card planned-live-card--controls">
                  <div class="planned-live-card__head">
                    <div class="planned-workflow-card__step">1</div>
                    <div>
                      <h3>Controls</h3>
                      <p>Keep this first version focused on just what we need.</p>
                    </div>
                  </div>

                  <label class="planned-live-field">
                    <span>Output language</span>
                    <AppSelect v-model="selectedOutputLanguage" :options="outputLanguages" :disabled="isLiveSessionRunning" />
                  </label>

                  <label class="planned-live-field" style="margin-top: 1rem;">
                    <span>Microphone Input (for Earbuds)</span>
                    <AppSelect 
                      v-model="selectedDeviceId" 
                      :options="[{value: '', label: 'Default Microphone'}, ...audioDevices.map(d => ({ value: d.deviceId, label: d.label || 'Unknown Microphone' }))]" 
                    />
                  </label>

                  <label class="planned-live-toggle">
                    <input v-model="autoRead" type="checkbox" />
                    <span>Speak translated output (Google TTS)</span>
                  </label>

                  <div class="planned-live-actions">
                    <button
                      type="button"
                      class="planned-btn planned-btn--primary"
                      :disabled="isLiveSessionRunning"
                      @click="startLiveSession"
                      @mousemove="handleReflectiveMove"
                      @mouseleave="resetReflectiveMove"
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      class="planned-btn planned-btn--ghost"
                      :disabled="!isLiveSessionRunning"
                      @click="stopLiveSession"
                      @mousemove="handleReflectiveMove"
                      @mouseleave="resetReflectiveMove"
                    >
                      Stop
                    </button>
                  </div>
                </article>

                <article class="planned-live-card">
                  <div class="planned-live-card__head">
                    <div class="planned-workflow-card__step">2</div>
                    <div>
                      <h3>Input handling</h3>
                      <p>Microphone speech will be picked up live and the source language will be auto-detected.</p>
                    </div>
                  </div>

                  <div class="planned-live-note">
                    <strong>Auto-detect input:</strong>
                    <span>No source language selector needed for this flow.</span>
                    <span>Target language: {{ selectedOutputLanguage }}</span>
                  </div>
                </article>

                <article class="planned-live-card">
                  <div class="planned-live-card__head">
                    <div class="planned-workflow-card__step">3</div>
                    <div>
                      <h3>Output preview</h3>
                      <p>The translated stream can appear here once we wire the backend into this tab.</p>
                    </div>
                  </div>

                  <div class="planned-live-preview">
                    <p class="planned-live-preview__label">Selected output</p>
                    <h4>{{ selectedOutputLanguage }}</h4>
                    <p>
                      {{ isLiveSessionRunning ? 'Listening for live speech...' : 'Press Start to begin a live session.' }}
                    </p>
                  </div>
                </article>
              </div>

              <p v-if="liveError" class="planned-alert planned-alert--error">{{ liveError }}</p>

              <div class="planned-live-feed">
                <div class="planned-live-feed__meta">
                  <span>Session {{ sessionId ? `#${sessionId.slice(0, 8)}` : '#--------' }}</span>
                  <span>{{ isRecording ? 'Recording live' : isProcessing ? 'Processing chunk' : 'Standby' }}</span>
                </div>

                <div ref="transcriptEl" class="planned-live-feed__list">
                  <div v-if="!utterances.length" class="planned-empty-copy">
                    Start the session and your original + translated lines will appear here.
                  </div>

                  <article v-for="utterance in utterances" :key="utterance.id" class="planned-live-item">
                    <div class="planned-live-item__meta">
                      <span>{{ utterance.detectedLanguage || 'Auto-detected' }}</span>
                      <span>{{ new Date(utterance.timestamp).toLocaleTimeString() }}</span>
                    </div>
                    <p>{{ utterance.originalText }}</p>
                    <strong>{{ utterance.translatedText }}</strong>
                  </article>
                </div>
              </div>

              <div class="planned-footnote">
                <p>Simple first pass</p>
                <span>Live translation now uses the same real session and chunk pipeline as the original working page.</span>
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'history'" class="planned-section-stack planned-section-stack--airy">
            <div class="planned-panel">
              <div class="planned-panel__header">
                <h2>Session History</h2>
                <p>Past sessions pulled from the backend and expanded inline.</p>
              </div>

              <div class="planned-history-toolbar">
                <button type="button" class="planned-btn planned-btn--soft" @click="loadSessions">Refresh History</button>
              </div>

              <p v-if="historyError" class="planned-alert planned-alert--error">{{ historyError }}</p>

              <div v-if="isHistoryLoading" class="planned-empty-copy">Loading sessions...</div>

              <div v-else-if="!sessions.length" class="planned-empty-copy">
                No saved sessions yet. Start a live translation session and come back here.
              </div>

              <div v-else class="planned-history-list">
                <article
                  v-for="session in sessions"
                  :key="session.id"
                  class="planned-history-card planned-history-card--stacked"
                >
                  <button type="button" class="planned-history-card__toggle" @click="toggleSession(session.id)">
                    <div>
                      <p class="planned-history-card__date">{{ formatDate(session.created_at) }}</p>
                      <h3>Session {{ session.id.slice(0, 8) }}</h3>
                    </div>
                    <span class="planned-history-card__status">
                      {{ expandedSession === session.id ? 'Hide' : 'Open' }}
                    </span>
                  </button>

                  <div v-if="expandedSession === session.id" class="planned-history-utterances">
                    <p v-if="!sessionUtterances[session.id]?.length" class="planned-empty-copy">
                      No utterances were stored for this session.
                    </p>

                    <article
                      v-for="utterance in sessionUtterances[session.id]"
                      :key="utterance.id"
                      class="planned-history-utterance"
                    >
                      <span>{{ formatDate(utterance.timestamp) }}</span>
                      <p>{{ utterance.text_original }}</p>
                      <strong>{{ utterance.text_translated }}</strong>
                    </article>
                  </div>
                </article>
              </div>
            </div>
          </section>

          <section v-else class="planned-section-stack planned-section-stack--airy">
            <div class="planned-about-grid">
              <div class="planned-panel">
                <div class="planned-panel__header centered">
                  <h2>Contact Us</h2>
                  <p>Frontend-only contact layout matching the planned style.</p>
                </div>

                <form class="planned-form" @submit.prevent>
                  <input type="text" placeholder="Your Name" />
                  <input type="email" placeholder="Your Email" />
                  <textarea rows="5" placeholder="Your Message"></textarea>
                  <button type="submit" class="planned-btn planned-btn--primary" @mousemove="handleReflectiveMove" @mouseleave="resetReflectiveMove">Send Message</button>
                </form>
              </div>

              <div class="planned-panel">
                <div class="planned-panel__header">
                  <h2>Connect With Us</h2>
                  <p>Reserved for links, design notes, and supporting app information.</p>
                </div>

                <div class="planned-link-list">
                  <a href="#" @click.prevent>GitHub</a>
                  <a href="#" @click.prevent>Twitter</a>
                  <a href="#" @click.prevent>Support Email</a>
                </div>

                <div class="planned-tag-cloud">
                  <span>Vision &amp; Philosophy</span>
                  <span>Technology Stack</span>
                  <span>Design Principles</span>
                  <span>Credits</span>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.planned-ui {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(112, 99, 255, 0.12), transparent 30%),
    radial-gradient(circle at 20% 20%, rgba(248, 183, 94, 0.08), transparent 25%),
    linear-gradient(180deg, #08070d 0%, #0f0c18 45%, #07070c 100%);
}

.planned-ui__bg,
.planned-ui__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.planned-ui__bg {
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at center, black 50%, transparent 95%);
}

.planned-ui__glow--left {
  background: radial-gradient(circle at 15% 40%, rgba(111, 210, 255, 0.14), transparent 25%);
}

.planned-ui__glow--right {
  background: radial-gradient(circle at 85% 25%, rgba(255, 193, 117, 0.12), transparent 22%);
}

.planned-shell {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(11, 10, 19, 0.78);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(22px);
  border-radius: 28px;
  overflow: hidden;
}

.planned-section-stack {
  display: grid;
  gap: 2rem;
  padding-bottom: 2rem;
}

.planned-section-stack--airy {
  gap: 2.4rem;
}

.planned-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
}

.planned-brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.planned-brand__text {
  display: flex;
  flex-direction: column;
}

.planned-brand__mark {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 14px;
  color: #f8d39b;
  background: linear-gradient(135deg, rgba(142, 121, 255, 0.18), rgba(245, 181, 116, 0.18));
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.planned-brand__name {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 0.08em;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
}

.planned-brand__name::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -0.32rem;
  height: 1px;
  background: linear-gradient(90deg, rgba(124, 212, 255, 0.12), rgba(249, 206, 142, 0.85), rgba(124, 212, 255, 0.12));
}

.planned-brand__lang {
  color: #f8f4ff;
  text-shadow: 0 0 22px rgba(124, 212, 255, 0.18);
}

.planned-brand__ify {
  color: #f5c98f;
  transform: skewX(-10deg);
  text-shadow: 0 0 22px rgba(245, 201, 143, 0.28);
}

.planned-brand__sub {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 0.55rem;
}

.planned-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.planned-nav__item {
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.65rem 0.9rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.56);
  background: transparent;
  transition: 0.25s ease;
}

.planned-nav__item::before,
.planned-btn::before {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background:
    radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(249, 222, 178, 0.28), transparent 34%),
    linear-gradient(120deg, rgba(130, 213, 255, 0.14), rgba(255, 255, 255, 0.03), rgba(245, 188, 123, 0.16));
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.planned-nav__item:hover,
.planned-nav__item--active {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
  box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.02);
}

.planned-nav__item:hover::before,
.planned-nav__item--active::before,
.planned-btn:hover::before {
  opacity: 1;
}

.planned-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.planned-current-tab {
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.planned-user-pill {
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(124, 212, 255, 0.14);
  background: rgba(124, 212, 255, 0.06);
  color: rgba(244, 248, 255, 0.88);
  font-size: 0.78rem;
}

.planned-hero,
.planned-panel,
.planned-language-strip,
.planned-about-grid {
  margin: 0 1.75rem;
}

.planned-hero,
.planned-panel {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
    radial-gradient(circle at center, rgba(255, 191, 128, 0.06), transparent 50%);
}

.planned-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(360px, 0.88fr);
  gap: 2.75rem;
  padding: 2.8rem 2.6rem;
}

.planned-kicker {
  color: #f4d2ae;
  font-size: 0.85rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 0.9rem;
}

.planned-hero h1,
.planned-panel h2 {
  font-size: clamp(1.9rem, 3vw, 3rem);
  line-height: 1.08;
  font-weight: 700;
}

.planned-panel h2 {
  font-size: clamp(1.5rem, 2vw, 2rem);
}

.planned-copy,
.planned-panel p {
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.7;
}

.planned-panel__header p {
  max-width: 64ch;
  margin: 0 auto;
  font-size: 1rem;
}

.planned-hero__copy {
  max-width: 780px;
}

.planned-hero__copy .planned-copy {
  max-width: 60ch;
  font-size: 1.08rem;
}

.planned-hero__actions,
.planned-download-row,
.planned-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
}

.planned-hero__actions {
  margin-top: 2.2rem;
}

.planned-btn {
  position: relative;
  overflow: hidden;
  border-radius: 999px;
  padding: 0.85rem 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: 0.25s ease;
}

.planned-btn:hover {
  transform: translateY(-1px);
}

.planned-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, rgba(110, 177, 255, 0.35), rgba(242, 176, 104, 0.28));
  box-shadow: 0 16px 30px rgba(72, 105, 201, 0.18);
}

.planned-btn--ghost,
.planned-btn--soft {
  color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.04);
}

.planned-inline-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: #f4c488;
  cursor: pointer;
}

.planned-btn::after,
.planned-nav__item::after {
  content: '';
  position: absolute;
  top: -120%;
  left: -30%;
  width: 40%;
  height: 320%;
  transform: rotate(20deg) translateX(-180%);
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.22), transparent);
  transition: transform 0.55s ease;
  pointer-events: none;
}

.planned-btn:hover::after,
.planned-nav__item:hover::after {
  transform: rotate(20deg) translateX(420%);
}

.planned-hero__signal {
  display: grid;
  align-content: center;
  gap: 1.4rem;
  min-height: 320px;
  padding: 2rem 1.8rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.planned-wave {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.45rem;
  min-height: 120px;
}

.planned-wave span {
  width: 8px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f7dfb3, #7cd4ff);
  animation: planned-wave 1.6s ease-in-out infinite;
}

.planned-wave span:nth-child(odd) {
  height: 38px;
}

.planned-wave span:nth-child(even) {
  height: 72px;
}

.planned-wave--compact {
  min-height: 80px;
}

.planned-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.planned-hero__meta span,
.planned-language-strip span,
.planned-chip,
.planned-tag-cloud span,
.planned-history-card__status {
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.75);
}

.planned-panel {
  padding: 2.2rem 1.7rem 1.8rem;
}

.planned-panel--wide {
  padding: 2.4rem 1.8rem 2rem;
}

.planned-panel__header {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-bottom: 1.6rem;
}

.planned-panel__header--split {
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.25rem;
}

.centered,
.centered-panel {
  text-align: center;
}

.planned-feature-grid,
.planned-process-grid,
.planned-about-grid {
  display: grid;
  gap: 1.35rem;
}

.planned-feature-grid,
.planned-process-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.planned-card,
.planned-process-card,
.planned-history-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  border-radius: 20px;
  padding: 1.45rem;
}

.planned-card__icon,
.planned-workflow-card__step {
  display: inline-grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  margin-bottom: 0.8rem;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(124, 212, 255, 0.2), rgba(255, 202, 132, 0.18));
  color: #f8deb9;
}

.planned-card h3,
.planned-process-card h3,
.planned-history-card h3 {
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.45;
  margin-bottom: 0.4rem;
}

.planned-card p,
.planned-process-card p,
.planned-history-card p {
  font-size: 0.98rem;
  line-height: 1.65;
}

.planned-process-card {
  text-align: center;
  padding: 1.55rem 1.35rem 1.45rem;
}

.planned-process-card__visual {
  height: 162px;
  margin-bottom: 1.35rem;
  border-radius: 18px;
  background:
    radial-gradient(circle at center, rgba(255, 195, 120, 0.2), transparent 45%),
    linear-gradient(135deg, rgba(108, 139, 255, 0.18), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.planned-live-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr 0.85fr;
  gap: 1.35rem;
}

.planned-live-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  border-radius: 22px;
  padding: 1.55rem;
  display: grid;
  gap: 1.1rem;
}

.planned-live-card--controls {
  background:
    linear-gradient(180deg, rgba(124, 212, 255, 0.05), rgba(255, 255, 255, 0.025)),
    rgba(255, 255, 255, 0.03);
}

.planned-live-card__head {
  display: flex;
  gap: 0.95rem;
  align-items: flex-start;
}

.planned-live-card__head p {
  font-size: 0.95rem;
}

.planned-live-field {
  display: grid;
  gap: 0.55rem;
}

.planned-live-field span,
.planned-live-preview__label {
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.52);
}

.planned-live-field select {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.95rem 1rem;
  color: white;
  outline: none;
}

.planned-select {
  position: relative;
}

.planned-select__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025)),
    radial-gradient(circle at 18% 20%, rgba(124, 212, 255, 0.12), transparent 38%);
  padding: 0.95rem 1rem;
  color: rgba(245, 247, 255, 0.96);
  text-align: left;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  transition: border-color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.planned-select__trigger:hover {
  border-color: rgba(124, 212, 255, 0.2);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(124, 212, 255, 0.06);
  transform: translateY(-1px);
}

.planned-select--open .planned-select__trigger {
  border-color: rgba(124, 212, 255, 0.28);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(124, 212, 255, 0.08);
}

.planned-select__chevron {
  font-size: 1rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.72);
  transition: transform 0.22s ease;
}

.planned-select--open .planned-select__chevron {
  transform: rotate(180deg);
}

.planned-select__menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 0.55rem);
  z-index: 30;
  display: grid;
  gap: 0.35rem;
  padding: 0.5rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background:
    linear-gradient(180deg, rgba(18, 18, 31, 0.96), rgba(12, 11, 22, 0.94)),
    radial-gradient(circle at top, rgba(124, 212, 255, 0.08), transparent 42%);
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.34);
}

.planned-select__option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.82rem 0.95rem;
  border-radius: 14px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(240, 243, 255, 0.84);
  text-align: left;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.planned-select__option:hover {
  background: rgba(255, 255, 255, 0.055);
  border-color: rgba(255, 255, 255, 0.06);
  color: #fff;
  transform: translateX(2px);
}

.planned-select__option--active {
  background:
    linear-gradient(90deg, rgba(124, 212, 255, 0.15), rgba(245, 193, 125, 0.12));
  border-color: rgba(124, 212, 255, 0.12);
  color: #fff;
}

.planned-select-menu-enter-active,
.planned-select-menu-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.planned-select-menu-enter-from,
.planned-select-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.planned-live-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.planned-live-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  color: rgba(255, 255, 255, 0.72);
}

.planned-live-toggle input {
  accent-color: #7cd4ff;
}

.planned-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.planned-live-note,
.planned-live-preview,
.planned-live-status {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 18px;
}

.planned-live-note,
.planned-live-preview {
  padding: 1rem 1.05rem;
}

.planned-live-note {
  display: grid;
  gap: 0.35rem;
}

.planned-live-note strong,
.planned-live-preview h4 {
  color: rgba(255, 255, 255, 0.92);
}

.planned-live-preview {
  min-height: 160px;
  align-content: start;
  gap: 0.45rem;
}

.planned-live-preview h4 {
  font-size: 1.35rem;
  line-height: 1.2;
}

.planned-live-feed {
  margin-top: 1.5rem;
  padding: 1.2rem;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.025);
}

.planned-live-feed__meta {
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.planned-live-feed__list {
  display: grid;
  gap: 0.95rem;
  max-height: 360px;
  overflow-y: auto;
}

.planned-live-item {
  padding: 1rem 1rem 1.05rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.planned-live-item__meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.44);
  font-size: 0.74rem;
  margin-bottom: 0.55rem;
}

.planned-live-item p {
  color: rgba(255, 255, 255, 0.72);
}

.planned-live-item strong {
  display: block;
  margin-top: 0.4rem;
  color: #96e4ff;
}

.planned-live-status {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1rem;
  color: rgba(255, 255, 255, 0.75);
  white-space: nowrap;
}

.planned-live-status--active {
  background: rgba(124, 212, 255, 0.08);
  border-color: rgba(124, 212, 255, 0.18);
  color: #eaf8ff;
}

.planned-live-status__dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.03);
}

.planned-live-status--active .planned-live-status__dot {
  background: #7cd4ff;
  box-shadow: 0 0 0 6px rgba(124, 212, 255, 0.08), 0 0 18px rgba(124, 212, 255, 0.45);
}

.planned-language-strip,
.planned-download-row,
.planned-footnote,
.planned-recorder__actions,
.planned-link-list,
.planned-tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.planned-download-row {
  justify-content: center;
  margin-top: 1.6rem;
}

.planned-dropzone,
.planned-recorder {
  padding: 2.5rem 2.4rem;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.025);
}

.planned-hidden-input {
  display: none;
}

.planned-dropzone {
  display: grid;
  justify-items: start;
  gap: 1.2rem;
  min-height: 180px;
}

.planned-dropzone--dragging {
  border-color: rgba(124, 212, 255, 0.35);
  background: rgba(124, 212, 255, 0.05);
}

.planned-dropzone p {
  max-width: 42ch;
  font-size: 1.05rem;
}

.planned-dropzone span {
  color: #f4c488;
}

.planned-file-meta,
.planned-upload-controls,
.planned-history-toolbar,
.planned-live-feed__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.planned-file-meta {
  margin-top: 1.1rem;
  padding: 1rem 1.1rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.planned-file-meta__name {
  color: rgba(255, 255, 255, 0.92);
  font-weight: 600;
}

.planned-file-meta span {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
}

.planned-upload-controls {
  margin-top: 1.2rem;
}

.planned-progress {
  margin-top: 1rem;
}

.planned-progress__bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.planned-progress__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #7cd4ff, #f4c488);
}

.planned-progress p,
.planned-empty-copy {
  margin-top: 0.65rem;
  color: rgba(255, 255, 255, 0.48);
}

.planned-alert {
  margin-top: 1rem;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  font-size: 0.94rem;
}

.planned-alert--error {
  border: 1px solid rgba(255, 115, 115, 0.24);
  background: rgba(255, 115, 115, 0.08);
  color: #ffb9b9;
}

.planned-transcript-output {
  margin-top: 1.6rem;
  min-height: 220px;
  padding: 1.2rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.028);
}

.planned-result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-bottom: 0.95rem;
}

.planned-result-meta span {
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.72);
}

.planned-result-block {
  margin-bottom: 1rem;
}

.planned-result-block h3 {
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.54);
}

.planned-result-block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.planned-result-block p {
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.7;
}

.planned-result-block--translated {
  margin-bottom: 0.55rem;
}

.planned-result-listen {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(124, 212, 255, 0.18);
  background: rgba(124, 212, 255, 0.08);
  color: rgba(235, 245, 255, 0.9);
  padding: 0.42rem 0.82rem;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: 0.2s ease;
}

.planned-result-listen:hover {
  border-color: rgba(249, 206, 142, 0.28);
  background: rgba(249, 206, 142, 0.1);
  color: #fff;
}

.planned-transcript-output pre {
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.7;
}

.planned-recorder {
  display: grid;
  gap: 1.6rem;
  justify-items: center;
  min-height: 420px;
}

.planned-recorder__orb {
  width: 110px;
  height: 110px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(255, 225, 179, 0.65), rgba(106, 157, 255, 0.16));
  box-shadow: 0 0 0 12px rgba(255, 255, 255, 0.03), 0 0 80px rgba(115, 179, 255, 0.16);
}

.planned-footnote {
  justify-content: center;
  margin-top: 1.8rem;
  color: rgba(255, 255, 255, 0.55);
}

.planned-footnote p {
  width: 100%;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.84);
}

.planned-history-list {
  display: grid;
  gap: 1rem;
}

.planned-history-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.4rem 1.5rem;
}

.planned-history-card--stacked {
  display: block;
  padding: 0;
}

.planned-history-card__toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.3rem 1.4rem;
  text-align: left;
}

.planned-history-card__date {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0.4rem;
}

.planned-history-utterances {
  display: grid;
  gap: 0.8rem;
  padding: 0 1.4rem 1.3rem;
}

.planned-history-utterance {
  padding-left: 1rem;
  border-left: 2px solid rgba(124, 212, 255, 0.2);
}

.planned-history-utterance span {
  display: block;
  margin-bottom: 0.35rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
}

.planned-history-utterance strong {
  display: block;
  margin-top: 0.25rem;
  color: #96e4ff;
}

.planned-about-grid {
  grid-template-columns: 1.4fr 0.8fr;
}

.planned-form {
  display: grid;
  gap: 1rem;
}

.planned-form input,
.planned-form textarea {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.95rem 1rem;
  color: white;
}

.planned-link-list {
  flex-direction: column;
  margin-bottom: 1rem;
}

.planned-link-list a {
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
}

@keyframes planned-wave {
  0%, 100% {
    transform: scaleY(0.45);
    opacity: 0.45;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}

@media (max-width: 1024px) {
  .planned-hero,
  .planned-feature-grid,
  .planned-process-grid,
  .planned-live-grid,
  .planned-about-grid {
    grid-template-columns: 1fr;
  }

  .planned-hero {
    gap: 2rem;
  }

  .planned-panel__header--split {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .planned-topbar,
  .planned-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .planned-actions,
  .planned-nav {
    width: 100%;
  }

  .planned-actions {
    justify-content: flex-start;
  }

  .planned-hero,
  .planned-panel,
  .planned-language-strip,
  .planned-about-grid {
    margin: 0 1rem;
  }

  .planned-hero {
    padding: 1.5rem 1.2rem;
  }

  .planned-panel,
  .planned-panel--wide,
  .planned-dropzone,
  .planned-recorder {
    padding-left: 1.15rem;
    padding-right: 1.15rem;
  }

  .planned-section-stack,
  .planned-section-stack--airy {
    gap: 1.35rem;
    padding-bottom: 1.35rem;
  }

  .planned-history-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

