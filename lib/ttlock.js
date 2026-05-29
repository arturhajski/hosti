const crypto = require('crypto');

const BASE_URL = 'https://euapi.ttlock.com';

async function getAccessToken() {
  const { TTLOCK_CLIENT_ID, TTLOCK_CLIENT_SECRET, TTLOCK_USERNAME, TTLOCK_PASSWORD } = process.env;

  const passwordMd5 = crypto.createHash('md5').update(TTLOCK_PASSWORD).digest('hex');

  const params = new URLSearchParams({
    client_id: TTLOCK_CLIENT_ID,
    client_secret: TTLOCK_CLIENT_SECRET,
    grant_type: 'password',
    username: TTLOCK_USERNAME,
    password: passwordMd5,
  });

  const res = await fetch(`${BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`TTLock auth HTTP ${res.status}`);

  const data = await res.json();
  if (!data.access_token) throw new Error(`TTLock auth failed: ${JSON.stringify(data)}`);

  return data.access_token;
}

/**
 * Generuje czasowy kod dostępu.
 * @param {string} accessToken
 * @param {string} lockId
 * @param {string} checkinDate   - YYYY-MM-DD (data check-in)
 * @param {string} checkoutDate  - YYYY-MM-DD (data check-out)
 * @param {string} timezone      - IANA, np. 'Europe/Warsaw'
 * @param {number} checkinHour
 * @param {number} checkoutHour
 * @returns {Promise<string>} kod dostępu
 */
async function generateCode(accessToken, lockId, checkinDate, checkoutDate, timezone, checkinHour, checkoutHour) {
  const { TTLOCK_CLIENT_ID } = process.env;

  const startDate = dateAtHourInTz(checkinDate, checkinHour, timezone);
  const endDate = dateAtHourInTz(checkoutDate, checkoutHour, timezone);

  const params = new URLSearchParams({
    clientId: TTLOCK_CLIENT_ID,
    accessToken,
    lockId,
    keyboardPwdType: '3',
    startDate: String(startDate),
    endDate: String(endDate),
    date: String(Date.now()),
  });

  const res = await fetch(`${BASE_URL}/v3/keyboardPwd/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`TTLock generateCode HTTP ${res.status}`);

  const data = await res.json();
  if (!data.keyboardPwd) throw new Error(`TTLock no code returned: ${JSON.stringify(data)}`);

  return data.keyboardPwd;
}

/**
 * Zwraca unix timestamp (ms) dla YYYY-MM-DD o podanej godzinie w danej strefie czasowej.
 * Np. ('2026-05-28', 15, 'Europe/Warsaw') → 1748437200000  (15:00 CEST = 13:00 UTC)
 */
function dateAtHourInTz(dateStr, hour, timezone) {
  const pad = (n) => String(n).padStart(2, '0');
  // Pobierz offset dla tej daty w tej strefie (w minutach)
  const offsetMin = tzOffsetAt(dateStr, timezone);
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const offsetStr = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return new Date(`${dateStr}T${pad(hour)}:00:00${offsetStr}`).getTime();
}

function tzOffsetAt(dateStr, timezone) {
  // Referencja: południe UTC danego dnia (bezpieczna godzina dla detekcji offsetu)
  const ref = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(ref);
  const lh = parseInt(parts.find(p => p.type === 'hour').value);
  const lm = parseInt(parts.find(p => p.type === 'minute').value);
  return (lh - 12) * 60 + lm;
}

module.exports = { getAccessToken, generateCode };
