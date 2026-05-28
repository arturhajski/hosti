require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getReservationsForDate, ymdInTz } = require('../lib/ical');

const APARTMENTS = [
  {
    name: process.env.APT1_NAME || 'Mieszkanie 1',
    url: process.env.ICAL_URL_APT1,
    timezone: process.env.APT1_TIMEZONE || 'Europe/Warsaw',
  },
  {
    name: process.env.APT2_NAME || 'Mieszkanie 2',
    url: process.env.ICAL_URL_APT2,
    timezone: process.env.APT2_TIMEZONE || 'Europe/Warsaw',
  },
];

const targetDate = process.argv[2] || ymdInTz(new Date(), APARTMENTS[0].timezone);

console.log(`\nSprawdzam rezerwacje na: ${targetDate}\n`);

(async () => {
  for (const apt of APARTMENTS) {
    if (!apt.url) {
      console.log(`[${apt.name}] Brak ICAL_URL — pomijam.\n`);
      continue;
    }

    console.log(`[${apt.name}] (${apt.timezone}) Pobieranie kalendarza...`);
    try {
      const reservations = await getReservationsForDate(apt.url, targetDate, apt.timezone);
      if (reservations.length === 0) {
        console.log(`  → Brak rezerwacji na ${targetDate}\n`);
      } else {
        for (const r of reservations) {
          console.log(`  → Gość:      ${r.guest}`);
          console.log(`     Check-in:  ${ymdInTz(r.checkin, apt.timezone)}`);
          console.log(`     Check-out: ${ymdInTz(r.checkout, apt.timezone)}\n`);
        }
      }
    } catch (err) {
      console.error(`  → BŁĄD: ${err.message}\n`);
    }
  }
})();
