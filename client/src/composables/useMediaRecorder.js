import { ref } from 'vue';

export function useMediaRecorder() {
  const isRecording = ref(false);
  const mediaRecorder = ref(null);
  const activeMimeType = ref('');
  const activeStream = ref(null);
  const stopTimer = ref(null);
  const analyserContext = ref(null);
  const analyserNode = ref(null);
  const analyserData = ref(null);
  const minChunkBytes = 10000;      // require slightly more audio data
  const minChunkMs = 1500;           // require at least 1.5 seconds of audio
  const discardUnderMs = 1500;       // aggressively skip anything under 1.5s
  const maxChunkMs = 8000;
  const silenceFramesNeeded = 8;
  const minSpeechFramesNeeded = 4;   // require ~500ms of speech (120ms * 4)
  const levelFloor = 12;             // lowered to catch quiet speech
  const pendingBlobs = ref([]);
  const pendingDurationMs = ref(0);
  const pendingBytes = ref(0);

  const selectedDeviceId = ref('');
  const audioDevices = ref([]);

  const getAudioDevices = async () => {
    try {
      // Request permission first, otherwise devices will have empty labels
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop tracks to free the microphone and not block Bluetooth profiles
      stream.getTracks().forEach(t => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      audioDevices.value = devices.filter(device => device.kind === 'audioinput');
      
      // If no device is selected but we have devices, select the default one
      if (!selectedDeviceId.value && audioDevices.value.length > 0) {
        const defaultDevice = audioDevices.value.find(d => d.deviceId === 'default') || audioDevices.value[0];
        selectedDeviceId.value = defaultDevice.deviceId;
      }
    } catch (err) {
      console.error('Error fetching audio devices:', err);
    }
  };

  // Ensure list updates if user plugs in earbuds later
  if (navigator.mediaDevices) {
    navigator.mediaDevices.addEventListener('devicechange', getAudioDevices);
  }

  const setMuted = (muted) => {
    if (activeStream.value) {
      activeStream.value.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  };

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
        const audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };
        
        if (selectedDeviceId.value) {
          audioConstraints.deviceId = { exact: selectedDeviceId.value };
        }

        activeStream.value = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints
        });

        const track = activeStream.value.getAudioTracks()[0];
        if (track) {
          console.log(`%c[Mic Selection] SUCCESS! Using device: ${track.label}`, 'color: #00ff00; font-weight: bold;');
        }
      }

      activeMimeType.value = detectMimeType();
      isRecording.value = true;

      if (!analyserContext.value && activeStream.value) {
        analyserContext.value = new AudioContext();
        const source = analyserContext.value.createMediaStreamSource(activeStream.value);
        analyserNode.value = analyserContext.value.createAnalyser();
        analyserNode.value.fftSize = 512;
        source.connect(analyserNode.value);
        analyserData.value = new Uint8Array(analyserNode.value.frequencyBinCount);
      }

      const startCycle = () => {
        if (!isRecording.value || !activeStream.value) return;

        const chunks = [];
        let chunkStart = Date.now();
        let silenceFrames = 0;
        let speechFrames = 0;
        let speechDetected = false;
        let ambientRms = 0;
        let calibrationFrames = 0;

        mediaRecorder.value = activeMimeType.value
          ? new MediaRecorder(activeStream.value, { mimeType: activeMimeType.value })
          : new MediaRecorder(activeStream.value);

        mediaRecorder.value.ondataavailable = (event) => {
          if (!event.data || event.data.size < 1000) return;
          chunks.push(event.data);
        };

        mediaRecorder.value.onstop = () => {
          if (stopTimer.value) {
            window.clearInterval(stopTimer.value);
            stopTimer.value = null;
          }

          const elapsed = Date.now() - chunkStart;
          const totalBytes = chunks.reduce((sum, chunk) => sum + (chunk?.size || 0), 0);

          const acceptByWeight = totalBytes >= minChunkBytes && elapsed >= minChunkMs;

          if (!chunks.length || totalBytes < 1000 || elapsed < discardUnderMs || !speechDetected) {
            console.log('Skipping short/silent audio chunk.', { totalBytes, elapsed, speechDetected });
          } else {
            const blob = activeMimeType.value
              ? new Blob(chunks, { type: activeMimeType.value })
              : new Blob(chunks);

            if (elapsed < minChunkMs || totalBytes < minChunkBytes) {
              pendingBlobs.value.push(blob);
              pendingDurationMs.value += elapsed;
              pendingBytes.value += totalBytes;
            } else {
              const mergedParts = pendingBlobs.value.length ? [...pendingBlobs.value, blob] : [blob];
              const mergedBlob = activeMimeType.value
                ? new Blob(mergedParts, { type: activeMimeType.value })
                : new Blob(mergedParts);
              onChunkAvailable(mergedBlob);
              pendingBlobs.value = [];
              pendingDurationMs.value = 0;
              pendingBytes.value = 0;
            }
          }

          if (pendingBlobs.value.length && pendingDurationMs.value >= minChunkMs && pendingBytes.value >= minChunkBytes) {
            const mergedBlob = activeMimeType.value
              ? new Blob(pendingBlobs.value, { type: activeMimeType.value })
              : new Blob(pendingBlobs.value);
            onChunkAvailable(mergedBlob);
            pendingBlobs.value = [];
            pendingDurationMs.value = 0;
            pendingBytes.value = 0;
          }

          if (isRecording.value) {
            startCycle();
          }
        };

        mediaRecorder.value.start();

        stopTimer.value = window.setInterval(() => {
          if (!mediaRecorder.value || mediaRecorder.value.state !== 'recording') return;
          if (!analyserNode.value || !analyserData.value) return;

          analyserNode.value.getByteTimeDomainData(analyserData.value);
          const rms = Math.sqrt(analyserData.value.reduce((s, v) => s + (v - 128) ** 2, 0) / analyserData.value.length);
          const elapsed = Date.now() - chunkStart;
          calibrationFrames += 1;

          if (!speechDetected) {
            ambientRms = calibrationFrames === 1
              ? rms
              : (ambientRms * 0.88) + (rms * 0.12);
          }

          const adaptiveThreshold = Math.max(levelFloor, ambientRms * 2.2);
          const isSpeechFrame = rms > adaptiveThreshold;

          if (isSpeechFrame) {
            speechFrames += 1;
            silenceFrames = 0;
          } else {
            silenceFrames += 1;
          }

          if (!speechDetected && speechFrames >= minSpeechFramesNeeded) {
            speechDetected = true;
          }

          const noSpeechTimeout = !speechDetected && elapsed >= 8000; // increased from 4000ms
          const naturalBoundary = speechDetected && silenceFrames >= silenceFramesNeeded && elapsed >= minChunkMs;
          const forcedBoundary = elapsed >= maxChunkMs;

          if (noSpeechTimeout || naturalBoundary || forcedBoundary) {
            mediaRecorder.value.stop();
          }
        }, 120);
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
      window.clearInterval(stopTimer.value);
      stopTimer.value = null;
    }
    if (mediaRecorder.value) {
      if (mediaRecorder.value.state === 'recording') {
        mediaRecorder.value.stop();
      }
    }
    pendingBlobs.value = [];
    pendingDurationMs.value = 0;
    pendingBytes.value = 0;
    analyserNode.value = null;
    analyserData.value = null;
    if (analyserContext.value) {
      analyserContext.value.close();
      analyserContext.value = null;
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
    stopRecording,
    selectedDeviceId,
    audioDevices,
    getAudioDevices,
    setMuted
  };
}
