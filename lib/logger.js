const { createClient } = require('@supabase/supabase-js');

let _client = null;

function getClient() {
  if (!_client) {
    _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _client;
}

/**
 * @param {Object} entry
 * @param {string} entry.apartment_name
 * @param {string} [entry.guest_name]
 * @param {string} [entry.checkin_date]   - YYYY-MM-DD
 * @param {string} [entry.checkout_date]  - YYYY-MM-DD
 * @param {string} [entry.generated_code]
 * @param {string} [entry.error_message]
 */
async function log(entry) {
  const supabase = getClient();
  const { error } = await supabase.from('cron_logs').insert([entry]);
  if (error) console.error('Supabase log error:', error.message);
}

module.exports = { log };
