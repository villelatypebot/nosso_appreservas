CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL DEFAULT 'Full House',
  short_name TEXT NOT NULL DEFAULT 'Full House',
  tagline TEXT,
  description TEXT,
  support_phone TEXT,
  support_email TEXT,
  whatsapp_phone TEXT,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#F47920',
  secondary_color TEXT NOT NULL DEFAULT '#C45E0A',
  reservation_code_prefix TEXT NOT NULL DEFAULT 'FH',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_business_settings') THEN
    CREATE POLICY "public_read_business_settings" ON business_settings FOR SELECT USING (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "svc_all_business_settings" ON business_settings FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS tr_business_settings_updated_at ON business_settings;
CREATE TRIGGER tr_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO business_settings (
  brand_name,
  short_name,
  tagline,
  description,
  support_phone,
  support_email,
  whatsapp_phone,
  primary_color,
  secondary_color,
  reservation_code_prefix
)
SELECT
  'Full House',
  'Full House',
  'Sistema de reservas profissional e replicável',
  'Gerencie reservas, horários, clientes, notificações e integrações em um único painel.',
  NULL,
  NULL,
  NULL,
  '#F47920',
  '#C45E0A',
  'FH'
WHERE NOT EXISTS (SELECT 1 FROM business_settings);

CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  clean_prefix TEXT := COALESCE(
    (
      SELECT NULLIF(upper(regexp_replace(reservation_code_prefix, '[^A-Za-z0-9]', '', 'g')), '')
      FROM business_settings
      ORDER BY created_at ASC
      LIMIT 1
    ),
    'FH'
  );
  code TEXT := left(clean_prefix, 4) || '-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
