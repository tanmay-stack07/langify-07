const Groq = require('groq-sdk');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Transcribes audio using Groq Whisper-large-v3-turbo
 * @param {string} filePath - Path to the temporary audio file
 * @param {string} originalName - Original filename to preserve extension
 * @param {string} responseFormat - 'json', 'text', 'verbose_json'
 * @param {string | undefined} prompt - Optional domain prompt for STT
 * @returns {Promise<any>} - Transcribed text or formatted data
 */
async function transcribeAudio(filePath, originalName, responseFormat = 'verbose_json', prompt = undefined) {
  let renamedPath;

  try {
    const ext = path.extname(originalName || '.webm') || '.webm';
    renamedPath = `${filePath}${ext}`;
    fs.renameSync(filePath, renamedPath);

    const reqData = {
      file: fs.createReadStream(renamedPath),
      model: 'whisper-large-v3-turbo',
      temperature: 0.1,  // increased from 0 to reduce hallucinations on noise
      response_format: responseFormat,
    };

    // Groq Whisper hard limit: 896 chars. Cap here so no caller can ever exceed it.
    if (prompt) {
      reqData.prompt = prompt.slice(0, 880);
    }

    return await groq.audio.transcriptions.create(reqData);
  } catch (error) {
    const providerMessage = error?.error?.error?.message || error.message || '';
    const shouldFallbackToOpenAI = error?.status === 403 && openai;

    if (shouldFallbackToOpenAI) {
      try {
        const openAIFormat = responseFormat === 'verbose_json' ? 'verbose_json' : responseFormat;
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(renamedPath),
          model: 'whisper-1',
          response_format: openAIFormat,
          prompt,
          temperature: 0.1,  // increased from 0 to reduce hallucinations
        });
        return transcription;
      } catch (fallbackError) {
        console.error('OpenAI Whisper Fallback Error:', fallbackError);
      }
    }

    console.error('Groq Whisper Transcription Error:', error);
    const wrappedError = new Error(`Transcription failed: ${error.message}`);
    wrappedError.status = error.status || 500;
    wrappedError.provider = 'groq';
    wrappedError.providerMessage = providerMessage;
    throw wrappedError;
  } finally {
    try {
      if (renamedPath && fs.existsSync(renamedPath)) fs.unlinkSync(renamedPath);
      else if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
  }
}

module.exports = { transcribeAudio };
