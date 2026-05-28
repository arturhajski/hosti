require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getReservationsForDate } = require('../lib/ical');

const APARTMENTS = [
  { name: process.env.APT1_NAME || 'Mieszkanie 1', url: process.env.ICAL_URL_APT1 },
  { name: process.env.APT2_NAME || 'Mieszkanie 2', url: process.env.ICAL_URL_APT2 },
];

const targetDate = process.argv[2] || new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });

console.log(`\nSprawdzam rezerwacje na: ${targetDate}\n`);

(async () => {
  for (const apt of APARTMENTS) {
    if (!apt.url) {
      console.log(`[${apt.name}] Brak ICAL_URL — pomijam.\n`);
      continue;
    }

    console.log(`[${apt.name}] Pobieranie kalendarza...`);
    try {
      const reservations = await getReservationsForDate(apt.url, targetDate);
      if (reservations.length === 0) {
        console.log(`  → Brak rezerwacji na ${targetDate}\n`);
      } else {
        for (const r of reservations) {
          console.log(`  → Gość: ${r.guest}`);
          console.log(`     Check-in:  ${r.checkin.toISOString().slice(0, 10)}`);
          console.log(`     Check-out: ${r.checkout.toISOString().slice(0, 10)}\n`);
        }
      }
    } catch (err) {
      console.error(`  → BŁĄD: ${err.message}\n`);
    }
  }
})();
