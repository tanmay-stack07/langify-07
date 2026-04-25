const Groq = require('groq-sdk');
require('dotenv').config();

// Primary Groq client — for translation (llama-4-scout dedicated key)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY_TRANSLATE || process.env.GROQ_API_KEY,
});

// Real-time translation model chain (fastest → best quality → last resort)
const REALTIME_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct', // Primary: fast + accurate
  'llama-3.3-70b-versatile',                   // Fallback: highest quality
  'gemma2-9b-it',                               // Last resort: always available
];

const normalizeForCompare = (text = '') => text.trim().replace(/\s+/g, ' ').toLowerCase();
const targetScriptHints = {
  hindi: 'Use standard Hindi written in Devanagari script.',
  tamil: 'Use standard Tamil written in Tamil script.',
  japanese: 'Use natural Japanese script.',
  arabic: 'Use standard Arabic script.',
  spanish: 'Use natural modern Spanish.',
  french: 'Use natural modern French.',
  german: 'Use natural modern German.',
  english: 'Use natural modern English.'
};

async function requestTranslation(text, targetLang, sourceLang, forceMode = false, modelIndex = 0) {
  const scriptHint = targetScriptHints[String(targetLang || '').toLowerCase()] || `Use natural ${targetLang}.`;
  const systemContent = forceMode
    ? `You are a strict translation engine.
1. The source language is ${sourceLang}.
2. The target language is ${targetLang}.
3. Your previous attempt failed because it repeated the source text.
4. Rewrite the text fully in ${targetLang}.
5. ${scriptHint}
6. Return only the translated text in ${targetLang}. No explanations.`
    : `You are a strict multilingual translation engine with expertise in code-mixed Indian languages.
1. Input may be Hinglish (Hindi+English), Marathish (Marathi+English), or pure language — handle all naturally.
2. Source language (detected): ${sourceLang}.
3. Translate into ${targetLang}. Translate the MEANING, not word-for-word.
4. Preserve tone, names, and intent.
5. Do not explain, do not summarize, do not answer the user.
6. ${scriptHint}
7. Return ONLY the translated text in ${targetLang}.`;

  const model = REALTIME_MODELS[modelIndex] || REALTIME_MODELS[REALTIME_MODELS.length - 1];

  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: `Text to translate into ${targetLang}:\n\n${text}` }
      ],
      temperature: forceMode ? 0 : 0.2,
      max_tokens: 1024,
    });
    let resultText = response.choices[0].message.content.trim();
    // Strip surrounding quotes if the model wrapped the translation
    resultText = resultText.replace(/^["']+|["']+$/g, '').trim();
    return resultText;
  } catch (err) {
    // Rate limit or model unavailable → try next model
    if ((err.status === 429 || err.status === 503) && modelIndex < REALTIME_MODELS.length - 1) {
      console.warn(`[Translation] Model ${model} failed (${err.status}), trying ${REALTIME_MODELS[modelIndex + 1]}`);
      return requestTranslation(text, targetLang, sourceLang, forceMode, modelIndex + 1);
    }
    throw err;
  }
}

async function requestStructuredTranslation(text, targetLang, sourceLang) {
  const scriptHint = targetScriptHints[String(targetLang || '').toLowerCase()] || `Use natural ${targetLang}.`;
  // Use the most capable available model for structured output
  const model = REALTIME_MODELS[1]; // llama-3.3-70b for structured pass
  const response = await groq.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a strict translation engine.
Return valid JSON with exactly these keys:
- source_language
- target_language
- translated_text

Rules:
1. Source language is ${sourceLang}.
2. Target language is ${targetLang}.
3. ${scriptHint}
4. translated_text must be fully translated, not copied from the source.
5. Input may be code-mixed (Hinglish/Marathish) — translate the meaning.`
      },
      {
        role: 'user',
        content: `Text to translate:\n\n${text}`
      }
    ],
    temperature: 0,
    response_format: { type: 'json_object' }
  });

  const parsed = JSON.parse(response.choices[0].message.content.trim());
  return String(parsed.translated_text || '').trim();
}

/**
 * Translates text using Groq LLaMA-3.3-70B with zero-config prompting.
 * Handles code-switched languages (Hinglish, Manglish, etc.)
 * @param {string} text - Original transcript from Whisper
 * @param {string} targetLang - The desired output language (default: 'English')
 * @returns {Promise<string>} - Translated text
 */
async function translateText(text, targetLang = 'English', sourceLang = 'auto') {
  try {
    const firstPass = await requestTranslation(text, targetLang, sourceLang, false);
    const unchanged = normalizeForCompare(firstPass) === normalizeForCompare(text);

    if (unchanged && normalizeForCompare(targetLang) !== normalizeForCompare(sourceLang)) {
      const secondPass = await requestTranslation(text, targetLang, sourceLang, true);
      if (normalizeForCompare(secondPass) !== normalizeForCompare(text)) {
        return secondPass;
      }
      return await requestStructuredTranslation(text, targetLang, sourceLang);
    }

    return firstPass;
  } catch (error) {
    console.error('Groq Translation Error:', error);
    throw new Error('Translation failed: ' + error.message);
  }
}

/**
 * Translates text with DAI context.
 */
async function translateTextDAI(text, targetLang, systemPrompt) {
  // Try llama-4-scout first for DAI, fall back to 70B
  const models = [REALTIME_MODELS[0], REALTIME_MODELS[1]];
  let lastError;
  for (const model of models) {
    try {
      const response = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Translate to ${targetLang}: ${text}` }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_tokens: 1024,
      });
      return JSON.parse(response.choices[0].message.content.trim());
    } catch (error) {
      lastError = error;
      if (error.status !== 429 && error.status !== 503) break; // only retry on rate limit
      console.warn(`[DAI Translation] ${model} failed (${error.status}), trying next model`);
    }
  }
  console.error('Groq DAI Translation Error:', lastError);
  throw new Error('DAI Translation failed: ' + lastError.message);
}

module.exports = { translateText, translateTextDAI };
