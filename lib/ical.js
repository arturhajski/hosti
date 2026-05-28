const ical = require('node-ical');

/**
 * Pobiera i parsuje iCal, zwraca rezerwacje na podaną datę (YYYY-MM-DD).
 * @param {string} url
 * @param {string} targetDate  - format YYYY-MM-DD
 * @param {string} timezone    - IANA timezone, np. 'Europe/Warsaw'
 * @returns {Promise<Array<{guest: string, checkin: Date, checkout: Date}>>}
 */
async function getReservationsForDate(url, targetDate, timezone = 'Europe/Warsaw') {
  const events = await ical.async.fromURL(url);
  const reservations = [];

  for (const key of Object.keys(events)) {
    const e = events[key];
    if (e.type !== 'VEVENT') continue;

    const start = e.start instanceof Date ? e.start : new Date(e.start);

    if (ymdInTz(start, timezone) !== targetDate) continue;

    const end = e.end instanceof Date ? e.end : new Date(e.end);
    const guest = extractGuestName(e.summary || '');

    reservations.push({ guest, checkin: start, checkout: end });
  }

  return reservations;
}

// Zwraca YYYY-MM-DD w danej strefie czasowej — niezależnie od strefy procesu
function ymdInTz(date, timezone) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: timezone }).format(date);
}

function extractGuestName(summary) {
  const match = summary.match(/\(([^)]+)\)/);
  if (match) return match[1];
  if (summary.toLowerCase().startsWith('reserved')) return 'Gość';
  return summary.trim() || 'Gość';
}

module.exports = { getReservationsForDate, ymdInTz };
