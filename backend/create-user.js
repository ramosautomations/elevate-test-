const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const hash = bcrypt.hashSync('Scootersif', 10);
    await pool.query(
      'INSERT INTO users (email, password, name, location, role, company_id, approved, is_active, is_admin, redirect_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      ['scooters1136@gmail.com', hash, 'Jerryn Timm', 'Iowa Falls', 'manager', 1, true, true, false, 'https://app.elevateerconsulting.com/scooters/dashboard/']
    );
    console.log('Created: Jerryn Timm');
  } catch(e) {
    console.error('Error:', e.message);
  }
  pool.end();
}
run();
