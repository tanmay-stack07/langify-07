const { translateText } = require('./services/translationService');

const TEST_CASES = [
  { input: "Mera code fix kar do, it's not working.", expected: "Please fix my code, it's not working." },
  { input: "Kasa aahes? Jevlaas ka?", expected: "How are you? Have you eaten?" },
  { input: "The pipeline is breaking in the middleware layer.", expected: "The pipeline is breaking in the middleware layer." },
  { input: "Main kal office nahi aaunga because of heavy rain.", expected: "I won't come to the office tomorrow because of heavy rain." }
];

async function runAccuracyTest() {
  console.log('--- ACCURACY STRESS TEST ---');
  for (const tc of TEST_CASES) {
    try {
      const translated = await translateText(tc.input, 'English');
      console.log(`Input: ${tc.input}`);
      console.log(`Translated: ${translated}`);
      console.log(`Match Score: [Manual Review Needed]`);
      console.log('---');
    } catch (err) {
      console.error(`Error on input: ${tc.input} | ${err.message}`);
    }
  }
}

runAccuracyTest();
