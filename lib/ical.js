const ical = require('node-ical');

/**
 * Pobiera iCal i zwraca rezerwacje na podaną datę.
 *
 * Airbnb używa VALUE=DATE (daty bez strefy czasowej — "floating").
 * Parsujemy datę bezpośrednio ze stringa DTSTART;VALUE=DATE:YYYYMMDD,
 * żeby uniknąć jakichkolwiek problemów z konwersją stref.
 *
 * @param {string} url
 * @param {string} targetDate  - YYYY-MM-DD
 * @returns {Promise<Array<{guest: string, checkin: string, checkout: string}>>}
 *          checkin/checkout jako YYYY-MM-DD string
 */
async function getReservationsForDate(url, targetDate) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching iCal`);
  const text = await res.text();

  const rawDates = extractRawDates(text);
  const events = ical.parseICS(text);
  const reservations = [];

  for (const key of Object.keys(events)) {
    const e = events[key];
    if (e.type !== 'VEVENT') continue;

    const dates = rawDates[e.uid];
    if (!dates || dates.checkin !== targetDate) continue;

    reservations.push({
      guest: extractGuestName(e.summary || ''),
      checkin: dates.checkin,
      checkout: dates.checkout,
    });
  }

  return reservations;
}

/**
 * Wyciąga daty check-in/checkout ze stringów DTSTART/DTEND w surowym tekście iCal.
 * Zwraca mapę { uid → { checkin: 'YYYY-MM-DD', checkout: 'YYYY-MM-DD' } }.
 */
function extractRawDates(icsText) {
  const result = {};
  const blocks = icsText.split('BEGIN:VEVENT').slice(1);

  for (const block of blocks) {
    const uid = (block.match(/^UID:(.+)$/m) || [])[1]?.trim();
    const checkin = parseICalDate(block, 'DTSTART');
    const checkout = parseICalDate(block, 'DTEND');
    if (uid && checkin) result[uid] = { checkin, checkout };
  }

  return result;
}

function parseICalDate(block, prop) {
  // VALUE=DATE: DTSTART;VALUE=DATE:20260528
  const dateOnly = block.match(new RegExp(`^${prop}(?:;[^:]+)?:(\\d{8})`, 'm'));
  if (dateOnly) {
    const d = dateOnly[1];
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }
  return null;
}

function extractGuestName(summary) {
  const match = summary.match(/\(([^)]+)\)/);
  if (match) return match[1];
  if (summary.toLowerCase().startsWith('reserved')) return 'Gość';
  return summary.trim() || 'Gość';
}

module.exports = { getReservationsForDate };
