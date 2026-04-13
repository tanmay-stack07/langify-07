// test_elevenlabs.js — Quick test to verify ElevenLabs TTS integration
require('dotenv').config();
const fs = require('fs');

async function testElevenLabs() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
  const model = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5';

  console.log('=== ElevenLabs TTS Test ===');
  console.log(`API Key: ${apiKey ? apiKey.slice(0, 8) + '...' : 'NOT SET'}`);
  console.log(`Voice ID: ${voiceId}`);
  console.log(`Model: ${model}`);
  console.log('');

  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY is not set in .env');
    process.exit(1);
  }

  // Test 1: Verify API key with a simple TTS request
  console.log('Test 1: Sending TTS request...');
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: 'Hello, this is a test of the Langify translation system.',
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    console.log(`  Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`  ❌ FAILED: ${errText}`);
      process.exit(1);
    }

    // Read the audio stream to verify it's valid
    const buffer = await res.arrayBuffer();
    const bytes = Buffer.from(buffer);
    console.log(`  ✅ Received ${bytes.length} bytes of audio`);
    
    // Save test audio to verify
    fs.writeFileSync('test_audio.mp3', bytes);
    console.log('  ✅ Saved to test_audio.mp3');

  } catch (err) {
    console.error(`  ❌ Network error: ${err.message}`);
    process.exit(1);
  }

  // Test 2: Test with Hindi text
  console.log('');
  console.log('Test 2: Hindi language TTS...');
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: 'नमस्ते, यह लैंगिफाई अनुवाद प्रणाली का परीक्षण है।',
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
          language_code: 'hi-IN',
        }),
      }
    );

    console.log(`  Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`  ❌ Hindi TTS FAILED: ${errText}`);
    } else {
      const buffer = await res.arrayBuffer();
      console.log(`  ✅ Hindi TTS: ${Buffer.from(buffer).length} bytes received`);
    }

  } catch (err) {
    console.error(`  ❌ Hindi test error: ${err.message}`);
  }

  // Test 3: Verify model info
  console.log('');
  console.log('Test 3: Checking available models...');
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/models', {
      headers: { 'xi-api-key': apiKey },
    });
    
    if (res.ok) {
      const models = await res.json();
      const flashModel = models.find(m => m.model_id === model);
      if (flashModel) {
        console.log(`  ✅ Model "${flashModel.name}" confirmed available`);
        console.log(`    Languages: ${flashModel.languages?.length || '?'} supported`);
      } else {
        console.log(`  ⚠️  Model ${model} not found in available models`);
        console.log(`  Available: ${models.map(m => m.model_id).join(', ')}`);
      }
    }
  } catch (err) {
    console.log(`  ⚠️  Could not fetch models: ${err.message}`);
  }

  // Test 4: Check subscription/usage
  console.log('');
  console.log('Test 4: Checking subscription...');
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': apiKey },
    });
    
    if (res.ok) {
      const sub = await res.json();
      console.log(`  ✅ Tier: ${sub.tier}`);
      console.log(`  Characters used: ${sub.character_count} / ${sub.character_limit}`);
      const remaining = sub.character_limit - sub.character_count;
      console.log(`  Characters remaining: ${remaining}`);
    }
  } catch (err) {
    console.log(`  ⚠️  Could not check subscription: ${err.message}`);
  }

  console.log('');
  console.log('=== All tests complete ===');
}

testElevenLabs();
