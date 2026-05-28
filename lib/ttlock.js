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
 * @param {Date} checkinDate  - data check-in (godzina CHECKIN_HOUR)
 * @param {Date} checkoutDate - data check-out (godzina CHECKOUT_HOUR)
 * @returns {Promise<string>} kod dostępu
 */
async function generateCode(accessToken, lockId, checkinDate, checkoutDate) {
  const { TTLOCK_CLIENT_ID, CHECKIN_HOUR = '15', CHECKOUT_HOUR = '11' } = process.env;

  const startDate = toUnixMs(checkinDate, parseInt(CHECKIN_HOUR));
  const endDate = toUnixMs(checkoutDate, parseInt(CHECKOUT_HOUR));

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

function toUnixMs(date, hour) {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

module.exports = { getAccessToken, generateCode };
