<script setup>
import { ref } from 'vue';
import axios from 'axios';

const file = ref(null);
const fileName = ref('');
const fileSize = ref('');
const isDragging = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const transcription = ref(null);
const error = ref('');
const outputFormat = ref('verbose_json');

const supportedFormats = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'ogg', 'opus', 'wav', 'webm', 'flac'];

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const handleFileSelect = (e) => {
  const selected = e.target.files[0];
  if (selected) setFile(selected);
};

const handleDrop = (e) => {
  isDragging.value = false;
  const dropped = e.dataTransfer.files[0];
  if (dropped) setFile(dropped);
};

const setFile = (f) => {
  const ext = f.name.split('.').pop().toLowerCase();
  if (!supportedFormats.includes(ext)) {
    error.value = `Unsupported format ".${ext}". Supported: ${supportedFormats.join(', ')}`;
    return;
  }
  if (f.size > 25 * 1024 * 1024) {
    error.value = 'File too large. Maximum size is 25MB.';
    return;
  }
  error.value = '';
  file.value = f;
  fileName.value = f.name;
  fileSize.value = formatBytes(f.size);
  transcription.value = null;
};

const clearFile = () => {
  file.value = null;
  fileName.value = '';
  fileSize.value = '';
  transcription.value = null;
  error.value = '';
};

const uploadFile = async () => {
  if (!file.value) return;
  
  isUploading.value = true;
  uploadProgress.value = 0;
  error.value = '';
  transcription.value = null;

  const formData = new FormData();
  formData.append('audio', file.value);

  try {
    const response = await axios.post(
      `http://localhost:3000/api/transcribe?format=${outputFormat.value}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          uploadProgress.value = Math.round((e.loaded * 100) / e.total);
        }
      }
    );
    transcription.value = response.data.transcription;
  } catch (err) {
    error.value = err.response?.data?.error || 'Upload failed. Please try again.';
  } finally {
    isUploading.value = false;
  }
};

const copyToClipboard = async () => {
  const text = typeof transcription.value === 'string' ? transcription.value : transcription.value?.text || '';
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  } catch (err) {
    console.error('Copy failed:', err);
  }
};

const transcriptText = () => {
  if (!transcription.value) return '';
  if (typeof transcription.value === 'string') return transcription.value;
  return transcription.value.text || JSON.stringify(transcription.value, null, 2);
};
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-6">
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="mb-10">
        <h1 class="text-3xl font-bold tracking-tight mb-2">File Upload</h1>
        <p class="text-white/30 font-light">Upload an audio file for instant transcription powered by Groq Whisper.</p>
      </div>

      <!-- Drop Zone -->
      <div @dragover.prevent="isDragging = true" 
           @dragleave="isDragging = false"
           @drop.prevent="handleDrop"
           class="relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group"
           :class="isDragging ? 'border-cyan-500/50 bg-cyan-500/[0.05]' : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]'"
           @click="$refs.fileInput.click()">
        <input ref="fileInput" type="file" class="hidden" :accept="supportedFormats.map(f => `.${f}`).join(',')" @change="handleFileSelect" />
        
        <div class="p-12 flex flex-col items-center justify-center gap-4">
          <div class="w-16 h-16 rounded-full border border-white/[0.06] bg-white/[0.03] flex items-center justify-center group-hover:border-cyan-500/30 transition-colors">
            <svg class="w-7 h-7 text-white/20 group-hover:text-cyan-400/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div class="text-center">
            <p class="text-sm font-medium text-white/50">Drop audio file here or <span class="text-cyan-400">browse</span></p>
            <p class="text-[10px] text-white/20 mt-2 tracking-wider uppercase">{{ supportedFormats.join(' · ') }}</p>
            <p class="text-[10px] text-white/15 mt-1">Max 25MB</p>
          </div>
        </div>
      </div>

      <!-- Selected File -->
      <div v-if="file" class="mt-4 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <div class="text-sm font-medium">{{ fileName }}</div>
            <div class="text-[10px] text-white/30">{{ fileSize }}</div>
          </div>
        </div>
        <button @click.stop="clearFile" class="p-2 text-white/30 hover:text-red-400 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Options & Upload -->
      <div v-if="file" class="mt-4 flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-[10px] uppercase tracking-widest text-white/30">Format</label>
          <select v-model="outputFormat" 
            class="px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-white/[0.05] text-white focus:outline-none focus:border-cyan-500/50"
            style="-webkit-appearance: none;">
            <option value="verbose_json" class="bg-[#1a1a1a]">Verbose JSON</option>
            <option value="json" class="bg-[#1a1a1a]">JSON</option>
            <option value="text" class="bg-[#1a1a1a]">Plain Text</option>
          </select>
        </div>
        
        <button @click="uploadFile" :disabled="isUploading"
          class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-sm font-semibold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed">
          {{ isUploading ? 'Processing...' : 'Transcribe' }}
        </button>
      </div>

      <!-- Upload Progress -->
      <div v-if="isUploading" class="mt-4">
        <div class="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
               :style="{ width: uploadProgress + '%' }"></div>
        </div>
        <div class="text-[10px] text-white/30 mt-2 text-center">{{ uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Processing with Whisper...' }}</div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mt-4 p-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] text-sm text-red-400">
        {{ error }}
      </div>

      <!-- Results -->
      <div v-if="transcription" class="mt-8 animate-slide-up">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Transcription Result</h2>
          <button @click="copyToClipboard"
            class="px-4 py-2 text-xs rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-colors flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
        </div>

        <!-- Language detected -->
        <div v-if="transcription.language" class="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03]">
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          <span class="text-[10px] uppercase tracking-widest text-white/50">Detected: {{ transcription.language }}</span>
        </div>

        <div class="p-6 rounded-xl border border-white/[0.08] bg-white/[0.02] text-sm font-light leading-relaxed text-white/70 whitespace-pre-wrap max-h-96 overflow-y-auto">
          {{ transcriptText() }}
        </div>
      </div>
    </div>
  </div>
</template>
