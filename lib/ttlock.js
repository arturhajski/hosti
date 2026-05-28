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
 * @param {Date} checkinDate   - data check-in (jako Date, czas zostanie zastąpiony przez checkinHour)
 * @param {Date} checkoutDate  - data check-out (czas zastąpiony przez checkoutHour)
 * @param {string} timezone    - IANA timezone apartamentu, np. 'Europe/Warsaw'
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
 * Zwraca unix timestamp (ms) dla danej daty o podanej godzinie w danej strefie czasowej.
 * Np. 2026-05-28 o 15:00 Europe/Warsaw → 1748436000000
 */
function dateAtHourInTz(date, hour, timezone) {
  // Wyciągnij datę (YYYY-MM-DD) w strefie apartamentu
  const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone }).format(date);
  // Stwórz ISO string z godziną i strefą — parsowany przez Date jako UTC
  const pad = (n) => String(n).padStart(2, '0');
  // Przesunięcie strefy w minutach
  const offsetMin = tzOffsetMinutes(dateStr, timezone);
  const offsetSign = offsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMin);
  const offsetStr = `${offsetSign}${pad(Math.floor(absMin / 60))}:${pad(absMin % 60)}`;
  return new Date(`${dateStr}T${pad(hour)}:00:00${offsetStr}`).getTime();
}

function tzOffsetMinutes(dateStr, timezone) {
  // Porównaj UTC i lokalny czas dla danej daty w danej strefie
  const utcDate = new Date(`${dateStr}T12:00:00Z`);
  const localStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(utcDate);
  const [lh, lm] = localStr.split(':').map(Number);
  return (lh - 12) * 60 + lm;
}

module.exports = { getAccessToken, generateCode };
