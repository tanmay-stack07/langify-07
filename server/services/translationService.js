const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Translates text using Groq LLaMA-3.3-70B with zero-config prompting.
 * Handles code-switched languages (Hinglish, Manglish, etc.)
 * @param {string} text - Original transcript from Whisper
 * @param {string} targetLang - The desired output language (default: 'English')
 * @returns {Promise<string>} - Translated text
 */
async function translateText(text, targetLang = 'English') {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a universal, high-nuance translator. 
          1. Detect the source language (including code-switched languages like Hinglish/Manglish).
          2. Translate the text into ${targetLang}.
          3. Maintain the original tone, context, and technical terms.
          4. Return ONLY the translated text, no explanations.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content.trim();
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
