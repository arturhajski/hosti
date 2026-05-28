const ical = require('node-ical');

/**
 * Pobiera i parsuje iCal, zwraca rezerwacje na podaną datę (YYYY-MM-DD).
 * @param {string} url
 * @param {string} targetDate  - format YYYY-MM-DD
 * @returns {Promise<Array<{guest: string, checkin: Date, checkout: Date}>>}
 */
async function getReservationsForDate(url, targetDate) {
  const events = await ical.async.fromURL(url);

  const target = new Date(targetDate + 'T00:00:00');
  const targetYMD = ymd(target);

  const reservations = [];

  for (const key of Object.keys(events)) {
    const e = events[key];
    if (e.type !== 'VEVENT') continue;

    const start = e.start instanceof Date ? e.start : new Date(e.start);

    // Airbnb iCal: DTSTART to data check-in jako DATE (bez godziny)
    if (ymd(start) !== targetYMD) continue;

    const end = e.end instanceof Date ? e.end : new Date(e.end);

    // Wyciągnij imię gościa z SUMMARY, np. "Reserved - Jan Kowalski" albo just "Jan Kowalski"
    const summary = e.summary || '';
    const guest = extractGuestName(summary);

    reservations.push({ guest, checkin: start, checkout: end });
  }

  return reservations;
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function extractGuestName(summary) {
  // Airbnb format: "Reserved" lub "Airbnb (Jan K.)" lub samo imię
  const match = summary.match(/\(([^)]+)\)/);
  if (match) return match[1];
  if (summary.toLowerCase().startsWith('reserved')) return 'Gość';
  return summary.trim() || 'Gość';
}

module.exports = { getReservationsForDate };
