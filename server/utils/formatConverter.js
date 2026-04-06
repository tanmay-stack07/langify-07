/**
 * Formats a Whisper timestamp (seconds) into SRT time format (HH:MM:SS,mmm)
 * @param {number} seconds 
 * @returns {string}
 */
function formatSRTTime(seconds) {
  const date = new Date(0);
  date.setMilliseconds(seconds * 1000);
  const timePart = date.toISOString().substr(11, 8);
  const msPart = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
  return `${timePart},${msPart}`;
}

/**
 * Formats a Whisper timestamp (seconds) into VTT time format (HH:MM:SS.mmm)
 * @param {number} seconds 
 * @returns {string}
 */
function formatVTTTime(seconds) {
  const date = new Date(0);
  date.setMilliseconds(seconds * 1000);
  const timePart = date.toISOString().substr(11, 8);
  const msPart = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
  return `${timePart}.${msPart}`;
}

module.exports = { formatSRTTime, formatVTTTime };
