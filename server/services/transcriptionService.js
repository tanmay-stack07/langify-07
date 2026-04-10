const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Transcribes audio using Groq Whisper-large-v3-turbo
 * @param {string} filePath - Path to the temporary audio file
 * @param {string} originalName - Original filename to preserve extension
 * @param {string} responseFormat - 'json', 'text', 'verbose_json'
 * @returns {Promise<any>} - Transcribed text or formatted data
 */
async function transcribeAudio(filePath, originalName, responseFormat = 'verbose_json') {
  try {
    // Groq requires proper file extension — rename temp file
    const ext = path.extname(originalName || '.webm') || '.webm';
    const newPath = filePath + ext;
    fs.renameSync(filePath, newPath);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: "whisper-large-v3-turbo",
      temperature: 0,
      response_format: responseFormat,
    });

    // Clean up renamed file
    try { fs.unlinkSync(newPath); } catch {}

    return transcription;
  } catch (error) {
    console.error('Groq Whisper Transcription Error:', error);
    const wrappedError = new Error('Transcription failed: ' + error.message);
    wrappedError.status = error.status || 500;
    wrappedError.provider = 'groq';
    wrappedError.providerMessage = error?.error?.error?.message || error.message;
    throw wrappedError;
  }
}

module.exports = { transcribeAudio };
