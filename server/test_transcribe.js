const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function testTranscription() {
  console.log('Starting mock transcription test...');
  
  // Create a dummy audio file for testing
  const dummyFilePath = 'test_sample.txt';
  fs.writeFileSync(dummyFilePath, 'dummy audio content');

  const form = new FormData();
  form.append('audio', fs.createReadStream(dummyFilePath));

  try {
    const response = await fetch('http://localhost:3000/api/transcribe', {
      method: 'POST',
      body: form,
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));

    // Cleanup
    fs.unlinkSync(dummyFilePath);
  } catch (error) {
    console.error('Test Failed:', error.message);
  }
}

testTranscription();
