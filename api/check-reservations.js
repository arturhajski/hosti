const { getReservationsForDate } = require('../lib/ical');
const { getAccessToken, generateCode } = require('../lib/ttlock');
// const { log } = require('../lib/logger'); // TODO: włącz gdy Supabase gotowy
const log = async () => {};

const APARTMENTS = [
  {
    name: () => process.env.APT1_NAME || 'Mieszkanie 1',
    icalUrl: () => process.env.ICAL_URL_APT1,
    lockId: () => process.env.APT1_LOCK_ID,
  },
  {
    name: () => process.env.APT2_NAME || 'Mieszkanie 2',
    icalUrl: () => process.env.ICAL_URL_APT2,
    lockId: () => process.env.APT2_LOCK_ID,
  },
];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const timezone = process.env.TIMEZONE || 'Europe/Warsaw';
  const targetDate = req.query.date || todayInTz(timezone);
  const checkinHour = parseInt(process.env.CHECKIN_HOUR || '15');
  const checkoutHour = parseInt(process.env.CHECKOUT_HOUR || '11');

  const results = [];
  let accessToken = null;

  for (const apt of APARTMENTS) {
    const aptName = apt.name();
    const icalUrl = apt.icalUrl();
    const lockId = apt.lockId();

    if (!icalUrl || !lockId) continue;

    let reservations;
    try {
      reservations = await getReservationsForDate(icalUrl, targetDate);
    } catch (err) {
      console.error(`iCal error [${aptName}]:`, err.message);
      await log({ apartment_name: aptName, error_message: `iCal: ${err.message}` });
      results.push({ apartment: aptName, error: `Błąd pobierania kalendarza: ${err.message}` });
      continue;
    }

    for (const r of reservations) {
      try {
        if (!accessToken) accessToken = await getAccessToken();

        const code = await generateCode(accessToken, lockId, r.checkin, r.checkout, timezone, checkinHour, checkoutHour);

        results.push({
          apartment: aptName,
          guest: r.guest,
          checkin: `${r.checkin} ${String(checkinHour).padStart(2, '0')}:00`,
          checkout: `${r.checkout} ${String(checkoutHour).padStart(2, '0')}:00`,
          code,
          message: buildMessage(r.guest, code, checkinHour),
        });

        await log({
          apartment_name: aptName,
          guest_name: r.guest,
          checkin_date: r.checkin,
          checkout_date: r.checkout,
          generated_code: code,
        });
      } catch (err) {
        console.error(`TTLock error [${aptName}]:`, err.message);
        await log({ apartment_name: aptName, guest_name: r.guest, error_message: `TTLock: ${err.message}` });
        results.push({ apartment: aptName, guest: r.guest, error: `Błąd generowania kodu: ${err.message}` });
      }
    }
  }

  if (results.length === 0) {
    return res.status(200).json({ reservations: [], message: 'Brak rezerwacji na dziś.' });
  }

  return res.status(200).json({ reservations: results });
};

function todayInTz(timezone) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: timezone }).format(new Date());
}

function buildMessage(guest, code, checkinHour) {
  return `Cześć ${guest}! Witamy 😊\nKod do zamka: ${code}\nDziała od godziny ${String(checkinHour).padStart(2, '0')}:00.\nMiłego pobytu!`;
}
