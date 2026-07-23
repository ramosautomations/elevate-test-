ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#C8866A';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#7A9470';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS features JSONB NOT NULL
  DEFAULT '{"forms":true,"directory":true,"customer_reviews":true,"logs":true,"resources":true}';
UPDATE companies SET primary_color = '#dc2626', secondary_color = '#991b1b'
  WHERE slug = 'scooters' OR id = 1;
