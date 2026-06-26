const { spawn } = require('child_process');
const { readFileSync } = require('fs');
const { resolve } = require('path');

async function initSchema() {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const sql = readFileSync(resolve(__dirname, 'lib', 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Schema initialized');
  } finally {
    await pool.end();
  }
}

initSchema()
  .then(() => {
    const proc = spawn('node', ['server.js'], { stdio: 'inherit', cwd: __dirname });
    proc.on('exit', (code) => process.exit(code ?? 1));
  })
  .catch((e) => {
    console.error('Failed to initialize schema:', e.message);
    process.exit(1);
  });
