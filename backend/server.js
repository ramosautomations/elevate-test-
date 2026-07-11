require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'change-this-secret';

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireCompany(req, res) {
  if (!req.user || !req.user.company_id) {
    res.status(400).json({ error: 'No company associated with this account' });
    return null;
  }
  return req.user.company_id;
}

function requireFormsManager(req, res, next) {
  const role = (req.user.role || '').toLowerCase();
  if (!['owner', 'general manager'].includes(role)) {
    return res.status(403).json({ error: 'Owner or General Manager access required' });
  }
  next();
}

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'elevate-db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'elevate',
  user: process.env.DB_USER || 'elevate',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
  }
});

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    httpOnly: true,
    maxAge: 8 * 3600 * 1000
  }
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Login route
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Get user with company slug
    const { rows } = await pool.query(`
      SELECT u.*, c.slug as company_slug 
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.email = $1
    `, [email]);
    
    const user = rows[0];
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      // Log failed attempt
      if (user) {
        pool.query('INSERT INTO login_logs (user_id, email, success, location) VALUES ($1,$2,$3,$4)',
          [user.id, email, false, user.location || null]).catch(() => {});
      }
      return res.redirect('/?error=Invalid+email+or+password');
    }
    
    if (!user.approved) {
      return res.redirect('/?pending=1');
    }

    // Log successful login
    pool.query('INSERT INTO login_logs (user_id, email, success, location) VALUES ($1,$2,$3,$4)',
      [user.id, email, true, user.location || null]).catch(() => {});
    
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin,
        company_id: user.company_id,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 3600 * 1000
    });
    
    // Redirect to company dashboard
    const dashboardUrl = user.company_slug ? `/${user.company_slug}/dashboard/` : '/dashboard/';
    res.redirect(dashboardUrl);
    
  } catch (err) {
    console.error('Login error:', err);
    res.redirect('/?error=Something+went+wrong');
  }
});

// Logout route
app.get('/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.redirect('/');
});

// Check session
app.get('/auth/check-session', authenticateToken, (req, res) => {
  res.json({ authenticated: true, user: req.user });
});

// Get current user
app.get('/auth/current-user', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, is_admin, is_super_admin, location, name, role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching current user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Test endpoint
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    res.json({ 
      message: 'API is working', 
      userCount: result.rows[0].count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all employees (filtered by user role and location)
// Get all employees unfiltered (for supervisor dropdowns)
app.get('/api/employees/all', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, title, location, status
      FROM employees
      WHERE company_id = $1
      AND LOWER(title) IN ('general manager', 'manager', 'assistant manager', 'owner')
      AND status = 'Active'
      ORDER BY name ASC
    `, [req.user.company_id]);
    res.json(rows);
  } catch(err) {
    console.error('Employees all error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Get user details including location and role
    const { rows: userRows } = await pool.query(
      'SELECT location, role, is_admin FROM users WHERE id = $1',
      [user.id]
    );
    
    const currentUser = userRows[0];
    
    let query = `
      SELECT id, name, title, department, location,
       email, phone, supervisor, status, hire_date,
       employment_type, pay_type, pay_amount, termination_date
      FROM employees
      WHERE company_id = $1
    `;

    const params = [user.company_id];

    // Filter by location for non-admin managers
    if (currentUser && currentUser.location && !currentUser.is_admin && currentUser.role === 'manager') {
      query += ' AND location = $2';
      params.push(currentUser.location);
    }

    const isSuperAdmin = user.is_super_admin || user.is_admin;
    if (!isSuperAdmin) {
      query += ` AND LOWER(title) NOT IN ('store manager', 'general manager')`;
    }





    // Exclude the logged-in user's own record from the directory
    query += ` AND LOWER(email) != LOWER($${params.length + 1})`;
    params.push(user.email);




    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Add new employee
app.post('/api/employees', authenticateToken, async (req, res) => {
  try {
    const {
      name, title, department, location, email, phone,
      supervisor, hire_date, status, employment_type,
      pay_type, pay_amount, termination_date
    } = req.body;

    if (!name || !title || !location) {
      return res.status(400).json({ error: 'Name, title, and location are required' });
    }

    const { rows } = await pool.query(`
      INSERT INTO employees
        (name, title, department, location, email, phone, supervisor,
         hire_date, status, employment_type, pay_type, pay_amount,
         termination_date, company_id, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id, name, title, location, status, hire_date
    `, [
      name,
      title,
      department    || null,
      location,
      email         || null,
      phone         || null,
      supervisor    || null,
      hire_date     || null,
      status        || 'active',
      employment_type || 'full-time',
      pay_type      || 'hourly',
      pay_amount    || null,
      termination_date || null,
      req.user.company_id,
      req.user.id
    ]);

    res.status(201).json(rows[0]);

  } catch (err) {
    console.error('Add employee error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An employee with that email already exists' });
    }
    res.status(500).json({ error: 'Failed to add employee' });
  }
});
// Get single employee by ID
app.get('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const employeeId = req.params.id;
    
    const { rows } = await pool.query(
      `SELECT id, name, title, department, location,
              email, phone, supervisor, status, hire_date,
              employment_type, pay_type, pay_amount, termination_date
       FROM employees
       WHERE id = $1 AND company_id = $2`,
      [employeeId, req.user.company_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});


// Get single employee by ID
app.get('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const employeeId = req.params.id;
    
    const { rows } = await pool.query(
      `SELECT id, name, title, department, location, 
              email, phone, supervisor, status, hire_date
              employment_type, pay_type, pay_amount, termination_date
       FROM employees
       WHERE id = $1 AND company_id = $2`,
      [employeeId, req.user.company_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// Get all form submissions (records)
app.get('/api/records', authenticateToken, async (req, res) => {
  try {
    const { form_type, employee_id, status, location, start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        fs.*,
        e.name as employee_name,
        u.name as submitted_by_name
      FROM form_submissions fs
      LEFT JOIN employees e ON fs.employee_id = e.id
      LEFT JOIN users u ON fs.submitted_by = u.id
      WHERE fs.company_id = $1
    `;
    
    const params = [req.user.company_id];
    let paramCount = 1;
    
    if (form_type) {
      paramCount++;
      query += ` AND fs.form_type = $${paramCount}`;
      params.push(form_type);
    }
    
    if (employee_id) {
      paramCount++;
      query += ` AND fs.employee_id = $${paramCount}`;
      params.push(employee_id);
    }
    
    if (status) {
      paramCount++;
      query += ` AND fs.status = $${paramCount}`;
      params.push(status);
    }
    
    if (location) {
      paramCount++;
      query += ` AND fs.location = $${paramCount}`;
      params.push(location);
    }
    
    if (start_date) {
      paramCount++;
      query += ` AND fs.submission_date >= $${paramCount}`;
      params.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND fs.submission_date <= $${paramCount}`;
      params.push(end_date);
    }
    
    query += ' ORDER BY fs.submission_date DESC';
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
    
  } catch (err) {
    console.error('Records fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

app.delete('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { rows } = await pool.query(
      'DELETE FROM employees WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ success: true });

  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Submit form and generate PDF
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

app.post('/api/forms/submit', authenticateToken, async (req, res) => {
  try {
    const {
      form_type, form_title, employee_name, location,
      form_data
    } = req.body;

    if (!form_type || !employee_name) {
      return res.status(400).json({ error: 'form_type and employee_name are required' });
    }

    // Look up employee id
    const { rows: empRows } = await pool.query(
      'SELECT id FROM employees WHERE name = $1 AND company_id = $2',
      [employee_name, req.user.company_id]
    );
    const employee_id = empRows[0]?.id || null;

    // Save to form_submissions
    const { rows: subRows } = await pool.query(`
      INSERT INTO form_submissions
        (form_type, form_title, employee_id, employee_name, submitted_by,
         submitted_by_name, form_data, status, location, company_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'submitted',$8,$9)
      RETURNING id
    `, [
      form_type,
      form_title,
      employee_id,
      employee_name,
      req.user.id,
      req.user.name || req.user.email,
      JSON.stringify(form_data),
      location || null,
      req.user.company_id
    ]);

    const submission_id = subRows[0].id;

    // Generate PDF
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Build simple HTML for the PDF
      const html = buildFormPDF(form_title, employee_name, location, form_data);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfDir = '/data/documents';
      if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

      const filename = `${form_type}-${submission_id}-${Date.now()}.pdf`;
      const pdfPath = path.join(pdfDir, filename);

      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
      await browser.close();

      // Update submission with pdf path
      await pool.query(
        'UPDATE form_submissions SET pdf_filename=$1, pdf_path=$2 WHERE id=$3',
        [filename, pdfPath, submission_id]
      );

      res.json({ success: true, submission_id, pdf_filename: filename });

    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr);
      // Still return success even if PDF fails
      res.json({ success: true, submission_id, pdf_error: pdfErr.message });
    }

  } catch (err) {
    console.error('Form submit error:', err);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

// Serve PDF file
app.get('/api/forms/pdf/:filename', authenticateToken, async (req, res) => {
  const filename = path.basename(req.params.filename);

  try {
    const ownerResult = await pool.query(
      'SELECT company_id FROM form_submissions WHERE pdf_filename = $1',
      [filename]
    );
    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ error: 'PDF not found' });
    }
    if (ownerResult.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
  } catch (err) {
    console.error('PDF ownership check error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  const filepath = path.join('/data/documents', filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'PDF not found' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(filepath);
});

function buildFormPDF(title, employee, location, data) {
  const rows = Object.entries(data)
    .map(([k, v]) => `<tr><td>${k.replace(/_/g,' ')}</td><td>${v}</td></tr>`)
    .join('');
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
  h1 { color: #991b1b; border-bottom: 2px solid #991b1b; padding-bottom: 10px; }
  .meta { margin-bottom: 20px; font-size: 14px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #991b1b; color: white; padding: 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
  td:first-child { font-weight: bold; width: 35%; text-transform: capitalize; }
  tr:nth-child(even) td { background: #fafafa; }
</style>
</head><body>
<h1>${title}</h1>
<div class="meta">
  <strong>Employee:</strong> ${employee} &nbsp;|&nbsp;
  <strong>Location:</strong> ${location || '—'} &nbsp;|&nbsp;
  <strong>Date:</strong> ${new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}
</div>
<table>
  <thead><tr><th>Field</th><th>Response</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`;
}

// ── FORM TEMPLATES (builder) ──

// List templates - management view (owner/GM only, includes inactive)
app.get('/api/forms/templates', authenticateToken, requireFormsManager, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ft.*, u.name as created_by_name
       FROM form_templates ft
       LEFT JOIN users u ON u.id = ft.created_by
       WHERE ft.company_id = $1
       ORDER BY ft.created_at DESC`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('List templates error:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// List templates visible to the current user (for the Forms panel / registry merge)
app.get('/api/forms/templates/available', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, form_type, title, description, audience
       FROM form_templates
       WHERE company_id = $1 AND is_active = true`,
      [req.user.company_id]
    );

    const myRole = (req.user.role || '').toLowerCase();

    const visible = rows.filter(t => {
      const aud = t.audience || { type: 'all' };
      if (aud.type === 'all') return true;
      if (aud.type === 'roles') return (aud.roles || []).some(r => r.toLowerCase() === myRole);
      if (aud.type === 'employees') return aud.employee_ids?.includes(req.user.id);
      return false;
    });

    res.json(visible);
  } catch (err) {
    console.error('List available templates error:', err);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// Get single template (for edit or for rendering the fill-out page)
app.get('/api/forms/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM form_templates WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Form not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Get template error:', err);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

// Create template
app.post('/api/forms/templates', authenticateToken, requireFormsManager, async (req, res) => {
  try {
    const { title, description, schema, audience } = req.body;

    if (!title || !Array.isArray(schema) || schema.length === 0) {
      return res.status(400).json({ error: 'title and at least one field are required' });
    }

    const form_type = 'custom-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

    const { rows } = await pool.query(
      `INSERT INTO form_templates (company_id, form_type, title, description, schema, audience, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        req.user.company_id,
        form_type,
        title,
        description || null,
        JSON.stringify(schema),
        JSON.stringify(audience || { type: 'all' }),
        req.user.id
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Create template error:', err);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

// Update template
app.put('/api/forms/templates/:id', authenticateToken, requireFormsManager, async (req, res) => {
  try {
    const { title, description, schema, audience } = req.body;

    if (!title || !Array.isArray(schema) || schema.length === 0) {
      return res.status(400).json({ error: 'title and at least one field are required' });
    }

    const { rows } = await pool.query(
      `UPDATE form_templates
       SET title=$1, description=$2, schema=$3, audience=$4, updated_at=NOW()
       WHERE id=$5 AND company_id=$6
       RETURNING *`,
      [title, description || null, JSON.stringify(schema), JSON.stringify(audience || { type: 'all' }), req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Form not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

// Archive (soft delete) template
app.patch('/api/forms/templates/:id/archive', authenticateToken, requireFormsManager, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE form_templates SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING id`,
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Form not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Archive template error:', err);
    res.status(500).json({ error: 'Failed to archive form' });
  }
});

// Update employee
app.put('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const {
      name, title, department, location, email, phone,
      supervisor, hire_date, status, employment_type,
      pay_type, pay_amount, termination_date
    } = req.body;

    if (!name || !title || !location) {
      return res.status(400).json({ error: 'Name, title, and location are required' });
    }

    const { rows } = await pool.query(`
      UPDATE employees SET
        name             = $1,
        title            = $2,
        department       = $3,
        location         = $4,
        email            = $5,
        phone            = $6,
        supervisor       = $7,
        hire_date        = $8,
        status           = $9,
        employment_type  = $10,
        pay_type         = $11,
        pay_amount       = $12,
        termination_date = $13,
        updated_by       = $14
      WHERE id = $15 AND company_id = $16
      RETURNING id, name, title, location, status
    `, [
      name, title, department || null, location,
      email || null, phone || null, supervisor || null,
      hire_date || null, status || 'active',
      employment_type || 'full-time', pay_type || 'hourly',
      pay_amount || null, termination_date || null,
      req.user.id, req.params.id, req.user.company_id
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE form submission (admin only)
app.delete('/api/forms/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_admin && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { rows } = await pool.query(
      'DELETE FROM form_submissions WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ==================== LOGS (super admin only) ====================

app.get('/api/logs/logins', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_super_admin && !req.user.is_admin) return res.status(403).json({ error: 'Unauthorized' });
    const { rows } = await pool.query(`
      SELECT u.name, u.email, u.location, l.login_at, l.success
      FROM login_logs l
      JOIN users u ON u.id = l.user_id
      WHERE u.company_id = $1
      ORDER BY l.login_at DESC
      LIMIT 500
    `, [req.user.company_id]);
    res.json(rows);
  } catch(err) {
    console.error('Login logs error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/logs/submissions', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_super_admin && !req.user.is_admin) return res.status(403).json({ error: 'Unauthorized' });
    const { rows } = await pool.query(`
      SELECT fs.id, fs.form_type, fs.form_title, fs.employee_name, fs.location,
             fs.submission_date, fs.status, fs.pdf_filename, u.name as submitted_by_name
      FROM form_submissions fs
      LEFT JOIN users u ON u.id = fs.submitted_by
      WHERE fs.company_id = $1
      ORDER BY fs.submission_date DESC
      LIMIT 500
    `, [req.user.company_id]);
    res.json(rows);
  } catch(err) {
    console.error('Submission logs error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// ==================== CUSTOMER REVIEWS ====================

// GET all reviews for company
app.get('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, customer_name, customer_email, rating, category,
             status, review_text, review_date, location, created_at
      FROM customer_reviews
      WHERE company_id = $1
      ORDER BY review_date DESC, created_at DESC
    `, [req.user.company_id]);
    res.json(rows);
  } catch (err) {
    console.error('Reviews fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST create review
app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { customer_name, customer_email, rating, category, status, review_text, review_date, location } = req.body;
    if (!customer_name) return res.status(400).json({ error: 'Customer name is required' });
    const { rows } = await pool.query(`
      INSERT INTO customer_reviews
        (company_id, created_by, customer_name, customer_email, rating, category, status, review_text, review_date, location)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      req.user.company_id,
      req.user.id,
      customer_name,
      customer_email || null,
      rating,
      category || 'Overall',
      status || 'New',
      review_text || null,
      review_date || new Date().toISOString().slice(0,10),
      location || null
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Review create error:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// PUT update review
app.put('/api/reviews/:id', authenticateToken, async (req, res) => {
  try {
    const { customer_name, customer_email, rating, category, status, review_text, review_date, location } = req.body;
    const { rows } = await pool.query(`
      UPDATE customer_reviews SET
        customer_name  = $1,
        customer_email = $2,
        rating         = $3,
        category       = $4,
        status         = $5,
        review_text    = $6,
        review_date    = $7,
        location       = $8,
        updated_at     = NOW()
      WHERE id = $9 AND company_id = $10
      RETURNING *
    `, [
      customer_name, customer_email || null, rating,
      category, status, review_text || null, review_date,
      location || null, req.params.id, req.user.company_id
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Review not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Review update error:', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// DELETE review
app.delete('/api/reviews/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
    const { rows } = await pool.query(
      'DELETE FROM customer_reviews WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Review not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Review delete error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});
// ==================== ERROR HANDLERS ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Elevate API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'production'}`);
});
