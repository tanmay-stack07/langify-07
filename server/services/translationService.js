const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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

async function requestTranslation(text, targetLang, sourceLang, forceMode = false) {
  const scriptHint = targetScriptHints[String(targetLang || '').toLowerCase()] || `Use natural ${targetLang}.`;
  const systemContent = forceMode
    ? `You are a strict translation engine.
1. The source language is ${sourceLang}.
2. The target language is ${targetLang}.
3. Your previous attempt failed because it repeated the source text.
4. Rewrite the text fully in ${targetLang}.
5. ${scriptHint}
6. Return only the translated text in ${targetLang}.`
    : `You are a strict translation engine.
1. The source language is ${sourceLang}.
2. Translate the provided text into ${targetLang}.
3. Preserve tone, names, and meaning.
4. Do not explain, do not summarize, do not answer the user.
5. ${scriptHint}
6. Return only the translated text in ${targetLang}.`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: systemContent
      },
      {
        role: 'user',
        content: `Translate this into ${targetLang}: """${text}"""`
      }
    ],
    temperature: forceMode ? 0 : 0.3,
  });

  return response.choices[0].message.content.trim();
}

async function requestStructuredTranslation(text, targetLang, sourceLang) {
  const scriptHint = targetScriptHints[String(targetLang || '').toLowerCase()] || `Use natural ${targetLang}.`;
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
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
4. translated_text must be fully translated, not copied from the source.`
      },
      {
        role: 'user',
        content: `Translate this text: """${text}"""`
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
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Translate to ${targetLang}: ${text}` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content.trim());
  } catch (error) {
    console.error('Groq DAI Translation Error:', error);
    throw new Error('DAI Translation failed: ' + error.message);
  }
}

module.exports = { translateText, translateTextDAI };
