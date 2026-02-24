const FORMAT_MARKERS = [
  /based\s+in/i,
  /fun\s+fact/i,
  /contribut/i,
  /looking\s+to/i,
  /who\s+(am\s+i|i\s+am|are\s+you)/i,
  /what\s+(i|do\s+you)\s+do/i,
  /i('m|\s+am)\s+/i,
];

function validateIntro(text) {
  if (!text || text.length < 50) {
    return { valid: false, reason: 'too_short' };
  }

  let markerCount = 0;
  for (const marker of FORMAT_MARKERS) {
    if (marker.test(text)) {
      markerCount++;
    }
  }

  if (markerCount < 2) {
    return { valid: false, reason: 'missing_format' };
  }

  return { valid: true };
}

module.exports = { validateIntro };
