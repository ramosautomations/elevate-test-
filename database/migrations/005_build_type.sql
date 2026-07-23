ALTER TABLE companies ADD COLUMN IF NOT EXISTS build_type VARCHAR(20) NOT NULL DEFAULT 'standard';
UPDATE companies SET build_type = 'custom' WHERE slug = 'scooters' OR id = 1;
