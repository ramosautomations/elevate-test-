-- Elevate Database Migration
-- This script restores the existing authdb and adds new tables for employee management

-- First, the existing database will be restored from authdb-backup.sql
-- Then we add the new tables below

-- ============================================================================
-- Add 'role' column to existing users table for simplified permission checks
-- ============================================================================

-- Add role column (maps to existing permission fields)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50);

-- Set roles based on existing permissions
UPDATE users 
SET role = CASE 
    WHEN is_super_admin = true THEN 'owner'
    WHEN is_admin = true THEN 'manager'
    ELSE 'employee'
END
WHERE role IS NULL;

-- Set default for new users
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'employee';

-- Create index on role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- Create employees table
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    supervisor VARCHAR(255),
    hire_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    
    -- Link to companies table
    company_id INTEGER REFERENCES companies(id),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Indexes for employees table
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_location ON employees(location);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Create form_submissions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS form_submissions (
    id SERIAL PRIMARY KEY,
    
    -- Form metadata
    form_type VARCHAR(100) NOT NULL,  -- 'performance', 'writeup', 'coaching', etc.
    form_title VARCHAR(255),
    
    -- Employee and submitter
    employee_id INTEGER REFERENCES employees(id),
    employee_name VARCHAR(255),  -- Denormalized for easier queries
    submitted_by INTEGER REFERENCES users(id),
    submitted_by_name VARCHAR(255),
    
    -- Form data as JSON
    form_data JSONB NOT NULL,
    
    -- Generated PDF
    pdf_filename VARCHAR(255),
    pdf_path VARCHAR(500),
    pdf_url VARCHAR(500),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'submitted',  -- submitted, reviewed, acknowledged, archived
    
    -- Location and company
    location VARCHAR(100),
    company_id INTEGER REFERENCES companies(id),
    
    -- Timestamps
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for form_submissions
CREATE INDEX IF NOT EXISTS idx_form_submissions_employee ON form_submissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_company ON form_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_type ON form_submissions(form_type);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_date ON form_submissions(submission_date);
CREATE INDEX IF NOT EXISTS idx_form_submissions_location ON form_submissions(location);

-- Full-text search on form data
CREATE INDEX IF NOT EXISTS idx_form_submissions_data ON form_submissions USING GIN (form_data);

-- Trigger for updated_at
CREATE TRIGGER update_form_submissions_updated_at 
    BEFORE UPDATE ON form_submissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed some sample employees (optional - comment out if not needed)
-- ============================================================================

-- Insert sample employees for the Scooters company
INSERT INTO employees (name, title, department, location, email, phone, supervisor, company_id, status)
VALUES 
    ('John Smith', 'Store Manager', 'Management', 'Iowa Falls', 'john.smith@scooters.com', '(515) 555-0101', NULL, 1, 'active'),
    ('Sarah Johnson', 'Assistant Manager', 'Management', 'Iowa Falls', 'sarah.johnson@scooters.com', '(515) 555-0102', 'John Smith', 1, 'active'),
    ('Mike Wilson', 'Shift Lead', 'Operations', 'Omaha', 'mike.wilson@scooters.com', '(402) 555-0103', 'John Smith', 1, 'active'),
    ('Emily Davis', 'Barista', 'Operations', 'Webster City', 'emily.davis@scooters.com', '(515) 555-0104', 'Sarah Johnson', 1, 'active'),
    ('Robert Brown', 'Shift Lead', 'Operations', 'Iowa Falls', 'robert.brown@scooters.com', '(515) 555-0105', 'John Smith', 1, 'active')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Check that everything was created
SELECT 'Users table' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Companies table', COUNT(*) FROM companies
UNION ALL
SELECT 'Employees table', COUNT(*) FROM employees
UNION ALL
SELECT 'Form submissions table', COUNT(*) FROM form_submissions
UNION ALL
SELECT 'Audit log table', COUNT(*) FROM audit_log;

-- Show user roles
SELECT id, email, name, location, role, is_admin, is_super_admin, is_active 
FROM users 
ORDER BY id;

-- Show sample employees
SELECT id, name, title, department, location, email 
FROM employees 
ORDER BY id 
LIMIT 5;

SELECT 'Migration completed successfully!' AS status;
