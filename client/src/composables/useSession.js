import { ref } from 'vue';
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

export function useSession() {
  const sessionId = ref(null);
  const utterances = ref([]);
  const isProcessing = ref(false);
  const targetLanguage = ref('English');
  const lastOriginal = ref('');
  const lastTranslated = ref('');
  const lastAt = ref(0);

  const normalizeText = (text) => (text || '').trim().replace(/\s+/g, ' ').toLowerCase();
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
    if (!audioBlob || audioBlob.size < 2000) {
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

    try {
      const response = await axios.post(`${API_BASE}/api/translate`, formData);
      const { originalText, translatedText, detectedLanguage, timestamp } = response.data;

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

      if (recentlySame && now - lastAt.value < 10000) {
        return null;
      }

      lastOriginal.value = normalizedOriginal;
      lastTranslated.value = normalizedTranslated;
      lastAt.value = now;

      const detectedLabel = languageMap[(detectedLanguage || '').toLowerCase()] || detectedLanguage || 'Auto';

      utterances.value.push({
        id: crypto.randomUUID(),
        originalText,
        translatedText,
        detectedLanguage: detectedLabel,
        timestamp
      });
      
      return response.data;
    } catch (err) {
      const providerMessage = err?.response?.data?.providerMessage || '';
      if (providerMessage.toLowerCase().includes('audio file is too short')) {
        console.warn('Short audio chunk ignored.');
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
