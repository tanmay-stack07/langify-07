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

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(activeStream.value);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let chunkStart = Date.now();
        let silenceFrames = 0;
        const SILENCE_FRAMES_NEEDED = 12; // ~800ms
        const SILENCE_THRESHOLD = 10;
        const MIN_CHUNK_MS = 1500;
        const MAX_CHUNK_MS = 8000;

        stopTimer.value = window.setInterval(() => {
          if (!mediaRecorder.value || mediaRecorder.value.state !== 'recording') return;

          analyser.getByteTimeDomainData(dataArray);
          const rms = Math.sqrt(dataArray.reduce((s, v) => s + (v - 128) ** 2, 0) / dataArray.length);
          const elapsed = Date.now() - chunkStart;

          if (rms < SILENCE_THRESHOLD) silenceFrames++;
          else silenceFrames = 0;

          const naturalBoundary = silenceFrames >= SILENCE_FRAMES_NEEDED && elapsed >= MIN_CHUNK_MS;
          const forcedBoundary = elapsed >= MAX_CHUNK_MS;

          if (naturalBoundary || forcedBoundary) {
            mediaRecorder.value.requestData(); // triggers ondataavailable
            chunkStart = Date.now();
            silenceFrames = 0;
          }
        }, 60);

        // Store reference to close context later
        mediaRecorder.value._audioContext = audioContext;
      };

      startCycle();
      console.log('Recording started with smart pause detection.');
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
    if (mediaRecorder.value) {
      if (mediaRecorder.value.state === 'recording') {
        mediaRecorder.value.stop();
      }
      if (mediaRecorder.value._audioContext) {
        mediaRecorder.value._audioContext.close();
      }
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
