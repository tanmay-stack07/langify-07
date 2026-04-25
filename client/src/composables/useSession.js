import { ref } from 'vue';
import axios from 'axios';
import { API_BASE } from '@/config/api.js';

export function useSession() {
  const sessionId = ref(null);
  const utterances = ref([]);
  const isProcessing = ref(false);
  const targetLanguage = ref('English');
  const lastOriginal = ref('');
  const lastTranslated = ref('');
  const lastAt = ref(0);
  const inferredTopic = ref(null);
  const recentOriginals = ref([]);

  const getUserId = () => {
    let id = localStorage.getItem('langify_user_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('langify_user_id', id);
    }
    return id;
  };

  const normalizeText = (text) => (text || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const similarityRatio = (a, b) => {
    const left = normalizeText(a);
    const right = normalizeText(b);
    if (!left || !right) return 0;
    if (left === right) return 1;
    const shorter = left.length < right.length ? left : right;
    const longer = left.length < right.length ? right : left;
    let overlap = 0;
    for (const token of shorter.split(' ')) {
      if (token && longer.includes(token)) overlap += token.length;
    }
    return overlap / Math.max(longer.length, 1);
  };
  // ── Whisper hallucination blocklist ──────────────────────────────────────
  // Whisper (at temperature=0) produces these phantom phrases on near-silent
  // or noise-only audio. Block them before they become utterances.
  const WHISPER_HALLUCINATION_BLOCKLIST = new Set([
    'thank you.', 'thanks for watching.', 'thanks for watching!',
    'thank you for watching.', 'thank you for watching!',
    'subscribe', 'please subscribe.', 'like and subscribe.',
    'bye.', 'bye bye.', 'goodbye.', 'the end.',
    'you', 'you.', 'yeah.', 'hmm.', 'hm.', 'uh.', 'um.',
    'so', 'so.', 'okay.', 'ok.', 'right.',
    '...', '…', '.', 'mhm.', 'ah.', 'oh.',
    'silence', 'music', '♪', 'applause',
    'thank you so much.', 'thanks.', 'thanks!',
    'see you next time.', 'see you.',
    'subtitles by', 'captions by', 'translated by',
    'i\'m sorry.', 'i don\'t know.', 'what?',
    'अभी के लिए बस इतना ही', 'ये था आज का वीडियो',
    'ご視聴ありがとうございました', 'ありがとうございます',
    'धन्यवाद', 'नमस्ते',
  ]);

  const isRepetitiveGarbage = (text) => {
    const normalized = normalizeText(text);
    if (!normalized) return true;
    if (normalized.length < 4) return true;

    // Block known Whisper hallucinations
    if (WHISPER_HALLUCINATION_BLOCKLIST.has(normalized)) return true;
    if (WHISPER_HALLUCINATION_BLOCKLIST.has(normalized.replace(/[.!?,]+$/g, ''))) return true;

    // Block single-word phantom outputs (Whisper often outputs just "you" or "so")
    const tokens = normalized.split(' ').filter(Boolean);
    if (tokens.length <= 2 && normalized.length < 10) return true;

    const repeatedPhrase = /^(.{4,40})\1{2,}$/i.test(normalized.replace(/\s+/g, ''));
    if (repeatedPhrase) return true;

    if (tokens.length >= 6) {
      const unique = new Set(tokens);
      if (unique.size <= Math.ceil(tokens.length / 3)) return true;
    }
    return false;
  };
  const languageMap = {
    en: 'English',
    hi: 'Hindi',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ta: 'Tamil',
    ja: 'Japanese',
    ar: 'Arabic'
  };

  const createSession = async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/sessions`, {
        metadata: { targetLanguage: targetLanguage.value }
      });
      sessionId.value = response.data.session.id;
      utterances.value = [];
      console.log('New session created:', sessionId.value);
    } catch (err) {
      console.warn('Session persistence unavailable, using temporary local session:', err.response?.data?.error || err.message);
      sessionId.value = crypto.randomUUID();
      utterances.value = [];
    }
  };

  const processAudioChunk = async (audioBlob) => {
    if (!audioBlob || audioBlob.size < 3000) {
      console.log('Skipping tiny audio blob.');
      return null;
    }
    isProcessing.value = true;
    const formData = new FormData();
    const mime = audioBlob?.type || '';
    let ext = 'webm';
    if (mime.includes('ogg')) ext = 'ogg';
    if (mime.includes('mp4')) ext = 'mp4';
    if (mime.includes('wav')) ext = 'wav';
    formData.append('audio', audioBlob, `chunk.${ext}`);
    formData.append('sessionId', sessionId.value);
    formData.append('targetLanguage', targetLanguage.value);
    formData.append('userId', getUserId());
    formData.append('sessionState', JSON.stringify({
      utterances: utterances.value.slice(-3),
      inferredTopic: inferredTopic.value
    }));

    try {
      const response = await axios.post(`${API_BASE}/api/translate`, formData);
      if (response.data?.skipped) {
        return null;
      }

      const { originalText, translatedText, detectedLanguage, timestamp, confidence, emotionalTone, inferredIntent, alt_1, alt_2 } = response.data;

      const normalizedOriginal = normalizeText(originalText);
      const normalizedTranslated = normalizeText(translatedText);
      const now = Date.now();
      const recentlySame =
        (normalizedOriginal && normalizedOriginal === lastOriginal.value) ||
        (normalizedTranslated && normalizedTranslated === lastTranslated.value) ||
        (normalizedOriginal && lastOriginal.value && (normalizedOriginal.startsWith(lastOriginal.value) || lastOriginal.value.startsWith(normalizedOriginal)));

      if (!normalizedOriginal || normalizedOriginal.length < 3) {
        return null;
      }

      if (isRepetitiveGarbage(originalText)) {
        console.warn('Discarding low-quality utterance.', { originalText, translatedText });
        return null;
      }

      if (recentlySame && now - lastAt.value < 10000) {
        return null;
      }

      const matchesRecentNoise = recentOriginals.value.some((entry) => similarityRatio(entry, originalText) > 0.96);
      if (matchesRecentNoise && now - lastAt.value < 12000) {
        return null;
      }

      lastOriginal.value = normalizedOriginal;
      lastTranslated.value = normalizedTranslated;
      lastAt.value = now;
      recentOriginals.value = [originalText, ...recentOriginals.value].slice(0, 5);

      const detectedLabel = languageMap[(detectedLanguage || '').toLowerCase()] || detectedLanguage || 'Auto';

      utterances.value.push({
        id: crypto.randomUUID(),
        originalText,
        translatedText,
        detectedLanguage: detectedLabel,
        confidence,
        emotionalTone,
        inferredIntent,
        alt_1,
        alt_2,
        timestamp
      });
      
      // Update inferredTopic after 3 utterances
      if (!inferredTopic.value && utterances.value.length >= 3) {
        // Simple heuristic for topic instead of another GPT call
        inferredTopic.value = "General conversation";
      }
      
      return response.data;
    } catch (err) {
      const providerMessage = err?.response?.data?.providerMessage || '';
      const errorCode = err?.response?.data?.errorCode || '';
      if (providerMessage.toLowerCase().includes('audio file is too short')) {
        console.warn('Short audio chunk ignored.');
        return null;
      }
      if (errorCode === 'AUDIO_CHUNK_SKIPPED') {
        console.warn('Short audio chunk skipped by backend.');
        return null;
      }
      console.error('Translation processing error:', err.message);
      throw err;
    } finally {
      isProcessing.value = false;
    }
  };

  return {
    sessionId,
    utterances,
    isProcessing,
    targetLanguage,
    createSession,
    processAudioChunk
  };
}
