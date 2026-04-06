import { ref } from 'vue';
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

export function useSession() {
  const sessionId = ref(null);
  const utterances = ref([]);
  const isProcessing = ref(false);
  const targetLanguage = ref('English');

  const createSession = async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/sessions`, {
        metadata: { targetLanguage: targetLanguage.value }
      });
      sessionId.value = response.data.session.id;
      utterances.value = [];
      console.log('New session created:', sessionId.value);
    } catch (err) {
      // Fallback to client-side UUID if API fails
      console.warn('Session API unavailable, using local ID:', err.message);
      sessionId.value = crypto.randomUUID();
      utterances.value = [];
    }
  };

  const processAudioChunk = async (audioBlob) => {
    isProcessing.value = true;
    const formData = new FormData();
    formData.append('audio', audioBlob, 'chunk.webm');
    formData.append('sessionId', sessionId.value);
    formData.append('targetLanguage', targetLanguage.value);

    try {
      const response = await axios.post(`${API_BASE}/api/translate`, formData);
      const { originalText, translatedText, detectedLanguage, timestamp } = response.data;
      
      utterances.value.push({
        id: crypto.randomUUID(),
        originalText,
        translatedText,
        detectedLanguage,
        timestamp
      });
      
      return response.data;
    } catch (err) {
      console.error('Translation processing error:', err.message);
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
