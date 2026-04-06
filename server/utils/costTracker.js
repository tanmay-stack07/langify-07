const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../logs/usage.log');

/**
 * Logs the cost of a Groq API call.
 * Groq pricing (as of March 2026):
 * - whisper-large-v3-turbo: $0.04 / audio hour (~$0.000667/min)
 * - llama-3.3-70b-versatile: $0.59 / 1M input tokens, $0.79 / 1M output tokens
 */
function logUsage(model, units) {
  const timestamp = new Date().toISOString();
  let estimatedCost = 0;

  if (model === 'whisper-large-v3-turbo') {
    estimatedCost = (units / 3600) * 0.04; // units in seconds
  } else if (model === 'llama-3.3-70b-versatile') {
    estimatedCost = (units / 1000000) * 0.59; // simplified: $0.59/1M tokens
  }

  const logEntry = `${timestamp} | Model: ${model} | Units: ${units} | Est. Cost: $${estimatedCost.toFixed(6)}\n`;
  
  if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE));
  }
  
  fs.appendFileSync(LOG_FILE, logEntry);
  console.log(`Usage Logged: ${logEntry.trim()}`);
}

module.exports = { logUsage };
