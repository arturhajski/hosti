CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  apartment_name TEXT,
  guest_name TEXT,
  checkin_date DATE,
  checkout_date DATE,
  generated_code TEXT,
  error_message TEXT
);

-- Tylko service_role może pisać/czytać logi
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON cron_logs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
