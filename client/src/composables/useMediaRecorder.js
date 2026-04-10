import { ref } from 'vue';

export function useMediaRecorder() {
  const isRecording = ref(false);
  const mediaRecorder = ref(null);
  const activeMimeType = ref('');
  const activeStream = ref(null);
  const stopTimer = ref(null);
  const cycleDurationMs = 4000;
  const minChunkBytes = 2000;

  const detectMimeType = () => {
    const candidates = [
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4'
    ];

    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startRecording = async (onChunkAvailable) => {
    try {
      if (!activeStream.value) {
        activeStream.value = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }

      activeMimeType.value = detectMimeType();
      isRecording.value = true;

      const startCycle = () => {
        if (!isRecording.value || !activeStream.value) return;

        const chunks = [];
        mediaRecorder.value = activeMimeType.value
          ? new MediaRecorder(activeStream.value, { mimeType: activeMimeType.value })
          : new MediaRecorder(activeStream.value);

        mediaRecorder.value.ondataavailable = (event) => {
          if (!event.data || event.data.size < 1000) return;
          chunks.push(event.data);
        };

        mediaRecorder.value.onstop = () => {
          const totalBytes = chunks.reduce((sum, chunk) => sum + (chunk?.size || 0), 0);
          if (chunks.length && totalBytes >= minChunkBytes) {
            const blob = activeMimeType.value
              ? new Blob(chunks, { type: activeMimeType.value })
              : new Blob(chunks);
            onChunkAvailable(blob);
          } else {
            console.log('Skipping short audio chunk.');
          }

          if (isRecording.value) {
            startCycle();
          }
        };

        mediaRecorder.value.start();
        stopTimer.value = window.setTimeout(() => {
          if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
            mediaRecorder.value.stop();
          }
        }, cycleDurationMs);
      };

      startCycle();
      console.log('Recording started with 4s chunk cycles.');
    } catch (err) {
      console.error('MediaRecorder Error:', err);
      throw err;
    }
  };

  const stopRecording = () => {
    if (!isRecording.value) return;
    isRecording.value = false;
    if (stopTimer.value) {
      window.clearTimeout(stopTimer.value);
      stopTimer.value = null;
    }
    if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
      mediaRecorder.value.stop();
    }
    if (activeStream.value) {
      activeStream.value.getTracks().forEach(track => track.stop());
      activeStream.value = null;
    }
    console.log('Recording stopped.');
  };

  return {
    isRecording,
    startRecording,
    stopRecording
  };
}
