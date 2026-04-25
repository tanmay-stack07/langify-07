// server/services/ttsService.js
//
// Text-to-Speech service.
// PRIMARY:  Google Cloud TTS (Neural2/WaveNet voices) — if GOOGLE_TTS_API_KEY is set.
// FALLBACK: Microsoft Edge TTS (free, no API key required).
//
// The synthesize(text, lang) signature is unchanged — no other files need editing.

const { MsEdgeTTS } = require('msedge-tts');
const axios = require('axios');

// ─────────────────────────────────────────────────────────────────────────────
// Google Cloud TTS — voice map
// Priority: Neural2 (best) → WaveNet → Standard
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_VOICE_MAP = {
  // Indian languages
  'hi':    { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A' },
  'hi-IN': { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A' },
  'mr':    { languageCode: 'mr-IN', name: 'mr-IN-Wavenet-A' },
  'mr-IN': { languageCode: 'mr-IN', name: 'mr-IN-Wavenet-A' },
  'ta':    { languageCode: 'ta-IN', name: 'ta-IN-Wavenet-A' },
  'ta-IN': { languageCode: 'ta-IN', name: 'ta-IN-Wavenet-A' },
  'te':    { languageCode: 'te-IN', name: 'te-IN-Standard-A' },
  'te-IN': { languageCode: 'te-IN', name: 'te-IN-Standard-A' },
  'kn':    { languageCode: 'kn-IN', name: 'kn-IN-Wavenet-A' },
  'kn-IN': { languageCode: 'kn-IN', name: 'kn-IN-Wavenet-A' },
  'ml':    { languageCode: 'ml-IN', name: 'ml-IN-Wavenet-A' },
  'ml-IN': { languageCode: 'ml-IN', name: 'ml-IN-Wavenet-A' },
  'gu':    { languageCode: 'gu-IN', name: 'gu-IN-Wavenet-A' },
  'gu-IN': { languageCode: 'gu-IN', name: 'gu-IN-Wavenet-A' },
  'bn':    { languageCode: 'bn-IN', name: 'bn-IN-Wavenet-A' },
  'bn-IN': { languageCode: 'bn-IN', name: 'bn-IN-Wavenet-A' },
  'pa':    { languageCode: 'pa-IN', name: 'pa-IN-Wavenet-A' },
  'pa-IN': { languageCode: 'pa-IN', name: 'pa-IN-Wavenet-A' },
  'ur':    { languageCode: 'ur-IN', name: 'ur-IN-Wavenet-A' },
  'ur-PK': { languageCode: 'ur-IN', name: 'ur-IN-Wavenet-A' },

  // East Asian
  'zh':    { languageCode: 'cmn-CN', name: 'cmn-CN-Neural2-A' },
  'zh-CN': { languageCode: 'cmn-CN', name: 'cmn-CN-Neural2-A' },
  'zh-TW': { languageCode: 'cmn-TW', name: 'cmn-TW-Wavenet-A' },
  'ja':    { languageCode: 'ja-JP',  name: 'ja-JP-Neural2-B' },
  'ja-JP': { languageCode: 'ja-JP',  name: 'ja-JP-Neural2-B' },
  'ko':    { languageCode: 'ko-KR',  name: 'ko-KR-Neural2-A' },
  'ko-KR': { languageCode: 'ko-KR',  name: 'ko-KR-Neural2-A' },

  // European
  'en':    { languageCode: 'en-US', name: 'en-US-Neural2-F' },
  'en-US': { languageCode: 'en-US', name: 'en-US-Neural2-F' },
  'en-GB': { languageCode: 'en-GB', name: 'en-GB-Neural2-A' },
  'es':    { languageCode: 'es-ES', name: 'es-ES-Neural2-A' },
  'es-ES': { languageCode: 'es-ES', name: 'es-ES-Neural2-A' },
  'fr':    { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' },
  'fr-FR': { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' },
  'de':    { languageCode: 'de-DE', name: 'de-DE-Neural2-A' },
  'de-DE': { languageCode: 'de-DE', name: 'de-DE-Neural2-A' },
  'it':    { languageCode: 'it-IT', name: 'it-IT-Neural2-A' },
  'it-IT': { languageCode: 'it-IT', name: 'it-IT-Neural2-A' },
  'pt':    { languageCode: 'pt-BR', name: 'pt-BR-Neural2-A' },
  'pt-BR': { languageCode: 'pt-BR', name: 'pt-BR-Neural2-A' },
  'ru':    { languageCode: 'ru-RU', name: 'ru-RU-Wavenet-A' },
  'ru-RU': { languageCode: 'ru-RU', name: 'ru-RU-Wavenet-A' },
  'nl':    { languageCode: 'nl-NL', name: 'nl-NL-Wavenet-A' },
  'nl-NL': { languageCode: 'nl-NL', name: 'nl-NL-Wavenet-A' },
  'pl':    { languageCode: 'pl-PL', name: 'pl-PL-Wavenet-A' },
  'pl-PL': { languageCode: 'pl-PL', name: 'pl-PL-Wavenet-A' },
  'sv':    { languageCode: 'sv-SE', name: 'sv-SE-Wavenet-A' },
  'sv-SE': { languageCode: 'sv-SE', name: 'sv-SE-Wavenet-A' },
  'da':    { languageCode: 'da-DK', name: 'da-DK-Wavenet-A' },
  'da-DK': { languageCode: 'da-DK', name: 'da-DK-Wavenet-A' },
  'fi':    { languageCode: 'fi-FI', name: 'fi-FI-Wavenet-A' },
  'fi-FI': { languageCode: 'fi-FI', name: 'fi-FI-Wavenet-A' },
  'nb':    { languageCode: 'nb-NO', name: 'nb-NO-Wavenet-A' },
  'nb-NO': { languageCode: 'nb-NO', name: 'nb-NO-Wavenet-A' },
  'cs':    { languageCode: 'cs-CZ', name: 'cs-CZ-Wavenet-A' },
  'cs-CZ': { languageCode: 'cs-CZ', name: 'cs-CZ-Wavenet-A' },
  'ro':    { languageCode: 'ro-RO', name: 'ro-RO-Wavenet-A' },
  'ro-RO': { languageCode: 'ro-RO', name: 'ro-RO-Wavenet-A' },
  'hu':    { languageCode: 'hu-HU', name: 'hu-HU-Wavenet-A' },
  'hu-HU': { languageCode: 'hu-HU', name: 'hu-HU-Wavenet-A' },
  'el':    { languageCode: 'el-GR', name: 'el-GR-Wavenet-A' },
  'el-GR': { languageCode: 'el-GR', name: 'el-GR-Wavenet-A' },
  'uk':    { languageCode: 'uk-UA', name: 'uk-UA-Wavenet-A' },
  'uk-UA': { languageCode: 'uk-UA', name: 'uk-UA-Wavenet-A' },

  // Middle East / Other
  'ar':    { languageCode: 'ar-XA', name: 'ar-XA-Wavenet-A' },
  'ar-SA': { languageCode: 'ar-XA', name: 'ar-XA-Wavenet-A' },
  'he':    { languageCode: 'he-IL', name: 'he-IL-Wavenet-A' },
  'he-IL': { languageCode: 'he-IL', name: 'he-IL-Wavenet-A' },
  'tr':    { languageCode: 'tr-TR', name: 'tr-TR-Wavenet-A' },
  'tr-TR': { languageCode: 'tr-TR', name: 'tr-TR-Wavenet-A' },
  'id':    { languageCode: 'id-ID', name: 'id-ID-Wavenet-A' },
  'id-ID': { languageCode: 'id-ID', name: 'id-ID-Wavenet-A' },
  'ms':    { languageCode: 'ms-MY', name: 'ms-MY-Wavenet-A' },
  'ms-MY': { languageCode: 'ms-MY', name: 'ms-MY-Wavenet-A' },
  'vi':    { languageCode: 'vi-VN', name: 'vi-VN-Wavenet-A' },
  'vi-VN': { languageCode: 'vi-VN', name: 'vi-VN-Wavenet-A' },
  'th':    { languageCode: 'th-TH', name: 'th-TH-Neural2-C' },
  'th-TH': { languageCode: 'th-TH', name: 'th-TH-Neural2-C' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Edge TTS fallback — voice map (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
const EDGE_VOICE_MAP = {
  'hi': 'hi-IN-SwaraNeural', 'hi-IN': 'hi-IN-SwaraNeural',
  'mr': 'mr-IN-AarohiNeural', 'mr-IN': 'mr-IN-AarohiNeural',
  'ta': 'ta-IN-PallaviNeural', 'ta-IN': 'ta-IN-PallaviNeural',
  'te': 'te-IN-ShrutiNeural', 'te-IN': 'te-IN-ShrutiNeural',
  'kn': 'kn-IN-SapnaNeural', 'kn-IN': 'kn-IN-SapnaNeural',
  'ml': 'ml-IN-SobhanaNeural', 'ml-IN': 'ml-IN-SobhanaNeural',
  'gu': 'gu-IN-DhwaniNeural', 'gu-IN': 'gu-IN-DhwaniNeural',
  'bn': 'bn-IN-TanishaaNeural', 'bn-IN': 'bn-IN-TanishaaNeural',
  'pa': 'pa-IN-GurpreetNeural', 'pa-IN': 'pa-IN-GurpreetNeural',
  'ur': 'ur-PK-UzmaNeural', 'ur-PK': 'ur-PK-UzmaNeural',
  'en': 'en-US-JennyNeural', 'en-US': 'en-US-JennyNeural', 'en-GB': 'en-GB-SoniaNeural',
  'zh': 'zh-CN-XiaoxiaoNeural', 'zh-CN': 'zh-CN-XiaoxiaoNeural',
  'ja': 'ja-JP-NanamiNeural', 'ja-JP': 'ja-JP-NanamiNeural',
  'ko': 'ko-KR-SunHiNeural', 'ko-KR': 'ko-KR-SunHiNeural',
  'es': 'es-ES-ElviraNeural', 'es-ES': 'es-ES-ElviraNeural',
  'fr': 'fr-FR-DeniseNeural', 'fr-FR': 'fr-FR-DeniseNeural',
  'de': 'de-DE-KatjaNeural', 'de-DE': 'de-DE-KatjaNeural',
  'it': 'it-IT-ElsaNeural', 'it-IT': 'it-IT-ElsaNeural',
  'pt': 'pt-BR-FranciscaNeural', 'pt-BR': 'pt-BR-FranciscaNeural',
  'ru': 'ru-RU-SvetlanaNeural', 'ru-RU': 'ru-RU-SvetlanaNeural',
  'ar': 'ar-SA-ZariyahNeural', 'ar-SA': 'ar-SA-ZariyahNeural',
  'tr': 'tr-TR-EmelNeural', 'tr-TR': 'tr-TR-EmelNeural',
  'nl': 'nl-NL-ColetteNeural', 'nl-NL': 'nl-NL-ColetteNeural',
  'pl': 'pl-PL-ZofiaNeural', 'pl-PL': 'pl-PL-ZofiaNeural',
  'sv': 'sv-SE-SofieNeural', 'sv-SE': 'sv-SE-SofieNeural',
  'da': 'da-DK-ChristelNeural', 'da-DK': 'da-DK-ChristelNeural',
  'fi': 'fi-FI-NooraNeural', 'fi-FI': 'fi-FI-NooraNeural',
  'nb': 'nb-NO-PernilleNeural', 'nb-NO': 'nb-NO-PernilleNeural',
  'id': 'id-ID-GadisNeural', 'id-ID': 'id-ID-GadisNeural',
  'ms': 'ms-MY-YasminNeural', 'ms-MY': 'ms-MY-YasminNeural',
  'vi': 'vi-VN-HoaiMyNeural', 'vi-VN': 'vi-VN-HoaiMyNeural',
  'th': 'th-TH-PremwadeeNeural', 'th-TH': 'th-TH-PremwadeeNeural',
  'uk': 'uk-UA-PolinaNeural', 'uk-UA': 'uk-UA-PolinaNeural',
  'cs': 'cs-CZ-VlastaNeural', 'cs-CZ': 'cs-CZ-VlastaNeural',
  'ro': 'ro-RO-AlinaNeural', 'ro-RO': 'ro-RO-AlinaNeural',
  'hu': 'hu-HU-NoemiNeural', 'hu-HU': 'hu-HU-NoemiNeural',
  'el': 'el-GR-AthinaNeural', 'el-GR': 'el-GR-AthinaNeural',
  'he': 'he-IL-HilaNeural', 'he-IL': 'he-IL-HilaNeural',
  'fa': 'fa-IR-DilaraNeural', 'fa-IR': 'fa-IR-DilaraNeural',
};

// ─────────────────────────────────────────────────────────────────────────────
// Language name → code (matches useSession.js / useTTS.js — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const TARGET_NAME_TO_CODE = {
  english: 'en', hindi: 'hi', marathi: 'mr', spanish: 'es',
  french: 'fr', german: 'de', japanese: 'ja', chinese: 'zh',
  arabic: 'ar', portuguese: 'pt', russian: 'ru', korean: 'ko',
  italian: 'it', tamil: 'ta', telugu: 'te', kannada: 'kn',
  gujarati: 'gu', bengali: 'bn', urdu: 'ur', dutch: 'nl',
  polish: 'pl', swedish: 'sv', danish: 'da', finnish: 'fi',
  norwegian: 'nb', indonesian: 'id', malay: 'ms', vietnamese: 'vi',
  thai: 'th', ukrainian: 'uk', czech: 'cs', romanian: 'ro',
  hungarian: 'hu', greek: 'el', hebrew: 'he', persian: 'fa',
  turkish: 'tr',
};

// ─────────────────────────────────────────────────────────────────────────────
// Resolve language code from name or code string
// ─────────────────────────────────────────────────────────────────────────────
function resolveCode(langCodeOrName) {
  if (!langCodeOrName) return 'en';
  if (GOOGLE_VOICE_MAP[langCodeOrName] || EDGE_VOICE_MAP[langCodeOrName]) return langCodeOrName;
  const normalized = langCodeOrName.toLowerCase().trim();
  const fromName = TARGET_NAME_TO_CODE[normalized];
  if (fromName) return fromName;
  const prefix = langCodeOrName.split('-')[0].toLowerCase();
  return prefix || 'en';
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Cloud TTS — synthesize via REST API (no extra npm package needed)
// ─────────────────────────────────────────────────────────────────────────────
async function synthesizeWithGoogle(text, langCodeOrName) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY not set');

  const code = resolveCode(langCodeOrName);
  const voice = GOOGLE_VOICE_MAP[code] || GOOGLE_VOICE_MAP['en'];

  const response = await axios.post(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      input: { text: text.slice(0, 5000) },
      voice: {
        languageCode: voice.languageCode,
        name: voice.name,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
      },
    },
    {
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const audioContent = response.data?.audioContent;
  if (!audioContent) throw new Error('Google TTS: no audio content returned');

  return Buffer.from(audioContent, 'base64');
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge TTS fallback (original logic — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function resolveEdgeVoice(langCodeOrName) {
  if (!langCodeOrName) return EDGE_VOICE_MAP['en'];
  const direct = EDGE_VOICE_MAP[langCodeOrName];
  if (direct) return direct;
  const normalized = langCodeOrName.toLowerCase().trim();
  const code = TARGET_NAME_TO_CODE[normalized];
  if (code && EDGE_VOICE_MAP[code]) return EDGE_VOICE_MAP[code];
  const prefix = langCodeOrName.split('-')[0].toLowerCase();
  if (EDGE_VOICE_MAP[prefix]) return EDGE_VOICE_MAP[prefix];
  console.warn(`[TTS][Edge] No voice for "${langCodeOrName}", using en-US`);
  return EDGE_VOICE_MAP['en'];
}

async function synthesizeWithEdge(text, langCodeOrName) {
  const voiceName = resolveEdgeVoice(langCodeOrName);
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceName, 'audio-24khz-96kbitrate-mono-mp3');
  const readable = tts.toStream(text.slice(0, 5000));

  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    const timeout = setTimeout(() => reject(new Error('Edge TTS: timeout (10s)')), 10000);

    readable.on('data', (chunk) => {
      if (chunk?.audio) { chunks.push(chunk.audio); totalBytes += chunk.audio.length; }
      else if (Buffer.isBuffer(chunk)) { chunks.push(chunk); totalBytes += chunk.length; }
    });
    readable.on('end', () => {
      clearTimeout(timeout);
      if (totalBytes === 0) return reject(new Error('Edge TTS: no audio data'));
      resolve(Buffer.concat(chunks));
    });
    readable.on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — Google first, Edge fallback (signature unchanged)
// ─────────────────────────────────────────────────────────────────────────────
async function synthesize(text, languageCodeOrName) {
  if (!text?.trim()) throw new Error('TTS: empty text');

  // Try Google Cloud TTS first (if key is present)
  if (process.env.GOOGLE_TTS_API_KEY) {
    try {
      const t0 = Date.now();
      const buffer = await synthesizeWithGoogle(text, languageCodeOrName);
      console.log(`[TTS][Google] ✅ ${languageCodeOrName} — ${Date.now() - t0}ms, ${buffer.length} bytes`);
      return buffer;
    } catch (err) {
      console.warn(`[TTS][Google] ⚠ Failed (${err.message}) — falling back to Edge TTS`);
    }
  }

  // Edge TTS fallback
  const t0 = Date.now();
  const buffer = await synthesizeWithEdge(text, languageCodeOrName);
  console.log(`[TTS][Edge] ✅ ${languageCodeOrName} — ${Date.now() - t0}ms, ${buffer.length} bytes`);
  return buffer;
}

function resolveVoice(langCodeOrName) {
  return resolveEdgeVoice(langCodeOrName); // kept for backward compat
}

function getSupportedLanguages() {
  return Object.keys(TARGET_NAME_TO_CODE);
}

module.exports = {
  synthesize,
  resolveVoice,
  getSupportedLanguages,
  VOICE_MAP: EDGE_VOICE_MAP, // backward compat alias
};
