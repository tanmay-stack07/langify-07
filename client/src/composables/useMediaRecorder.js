import { ref } from 'vue';

export function useMediaRecorder() {
  const isRecording = ref(false);
  const mediaRecorder = ref(null);
  const audioChunks = ref([]);

  const startRecording = async (onChunkAvailable) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.value = new MediaRecorder(stream);
      
      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          onChunkAvailable(event.data);
        }
      };

      // Set up 5-second chunking
      mediaRecorder.value.start(5000); 
      isRecording.value = true;
      console.log('Recording started with 5s chunking.');
    } catch (err) {
      console.error('MediaRecorder Error:', err);
      throw err;
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.value && isRecording.value) {
      mediaRecorder.value.stop();
      mediaRecorder.value.stream.getTracks().forEach(track => track.stop());
      isRecording.value = false;
      console.log('Recording stopped.');
    }
  };

  return {
    isRecording,
    startRecording,
    stopRecording
  };
}
