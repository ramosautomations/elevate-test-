CREATE TABLE form_templates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  form_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  schema JSONB NOT NULL,
  audience JSONB NOT NULL DEFAULT '{"type":"all"}',
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, form_type)
);

ALTER TABLE form_submissions ADD COLUMN template_id INTEGER REFERENCES form_templates(id);

CREATE INDEX idx_form_templates_company ON form_templates(company_id);
CREATE INDEX idx_form_templates_active ON form_templates(company_id, is_active);
