// test_server_tts.js — Test the actual /api/tts/elevenlabs endpoint
require('dotenv').config();

const API_BASE = 'http://localhost:3000';

async function testServerTTS() {
  console.log('=== Server TTS Endpoint Test ===\n');

  // Test 1: English via server endpoint
  console.log('Test 1: English via /api/tts/elevenlabs...');
  try {
    const res = await fetch(`${API_BASE}/api/tts/elevenlabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello, welcome to Langify translation platform.',
        languageCode: 'en-US',
      }),
    });
    console.log(`  Status: ${res.status}`);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      console.log(`  ✅ English: ${buf.byteLength} bytes audio received`);
    } else {
      const err = await res.text();
      console.log(`  ❌ Failed: ${err}`);
    }
  } catch (e) {
    console.log(`  ❌ Server not running? ${e.message}`);
    console.log('  → Start server with: npm start');
    return;
  }

  // Test 2: Hindi via server endpoint (tests BCP-47 to ISO conversion)
  console.log('\nTest 2: Hindi (hi-IN → hi) via /api/tts/elevenlabs...');
  try {
    const res = await fetch(`${API_BASE}/api/tts/elevenlabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'नमस्ते, लैंगिफाई में आपका स्वागत है।',
        languageCode: 'hi-IN',
      }),
    });
    console.log(`  Status: ${res.status}`);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      console.log(`  ✅ Hindi: ${buf.byteLength} bytes audio received`);
    } else {
      const err = await res.text();
      console.log(`  ❌ Failed: ${err}`);
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }

  // Test 3: Tamil via server endpoint
  console.log('\nTest 3: Tamil (ta-IN → ta) via /api/tts/elevenlabs...');
  try {
    const res = await fetch(`${API_BASE}/api/tts/elevenlabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'வணக்கம், லாங்கிஃபை மொழிபெயர்ப்பு தளத்திற்கு வரவேற்கிறோம்.',
        languageCode: 'ta-IN',
      }),
    });
    console.log(`  Status: ${res.status}`);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      console.log(`  ✅ Tamil: ${buf.byteLength} bytes audio received`);
    } else {
      const err = await res.text();
      console.log(`  ❌ Failed: ${err}`);
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }

  // Test 4: Unsupported language (Marathi mr-IN — not in ElevenLabs)
  console.log('\nTest 4: Marathi (mr-IN — unsupported, should omit language_code)...');
  try {
    const res = await fetch(`${API_BASE}/api/tts/elevenlabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello from Marathi test. This should fallback to auto-detect.',
        languageCode: 'mr-IN',
      }),
    });
    console.log(`  Status: ${res.status}`);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      console.log(`  ✅ Marathi fallback: ${buf.byteLength} bytes (auto-detect)`);
    } else {
      const err = await res.text();
      console.log(`  ❌ Failed: ${err}`);
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }

  // Test 5: Health check
  console.log('\nTest 5: Server health check...');
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const data = await res.json();
    console.log(`  ✅ Status: ${data.status}`);
    console.log(`  ✅ Models: ${data.models.stt} + ${data.models.llm}`);
  } catch (e) {
    console.log(`  ❌ Health check failed: ${e.message}`);
  }

  console.log('\n=== All server tests complete ===');
}

testServerTTS();
