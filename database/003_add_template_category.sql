ALTER TABLE form_templates
  ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'documentation'
  CHECK (category IN ('documentation', 'resource'));
