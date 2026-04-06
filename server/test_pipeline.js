const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testPipeline() {
  console.log('Testing Translation Pipeline...');

  // 1. Create a dummy audio file
  const dummyFilePath = './test_audio.webm';
  fs.writeFileSync(dummyFilePath, 'dummy data');

  const form = new FormData();
  form.append('audio', fs.createReadStream(dummyFilePath));
  form.append('targetLanguage', 'Spanish');
  form.append('sessionId', 'test-session-123');

  try {
    const response = await axios.post('http://localhost:3000/api/translate', form, {
      headers: form.getHeaders(),
    });

    console.log('Pipeline Results:', JSON.stringify(response.data, null, 2));
    
    // Cleanup
    fs.unlinkSync(dummyFilePath);
  } catch (err) {
    console.error('Pipeline Test Failed:', err.response?.data || err.message);
  }
}

testPipeline();
