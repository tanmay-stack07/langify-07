require('dotenv').config();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY_TRANSLATE });

groq.chat.completions.create({
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  messages: [
    { role: 'system', content: 'You are a strict translation engine. Translate to Spanish. Return ONLY the translated text.' },
    { role: 'user', content: 'Translate this into Spanish: """Hello world"""' }
  ]
}).then(res => console.log('Response:', res.choices[0].message.content)).catch(console.error);
