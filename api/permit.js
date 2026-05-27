const db = require('./db');
const url = require('url');

const parseBody = (req) => new Promise((resolve) => {
  if (req.body) return resolve(req.body);
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch {
      resolve({});
    }
  });
});

async function ensurePermitsTablePG() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS permits (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      permit_type VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      doctor_letter_number VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending',
      approved_by VARCHAR(100),
      approved_at TIMESTAMP
    );
  `);
  // Ensure all columns exist dynamically for pre-existing tables
  try { await db.query('ALTER TABLE permits ADD COLUMN IF NOT EXISTS reason TEXT;'); } catch(e){}
  try { await db.query('ALTER TABLE permits ADD COLUMN IF NOT EXISTS doctor_letter_number VARCHAR(100);'); } catch(e){}
  try { await db.query('ALTER TABLE permits ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'pending\';'); } catch(e){}
  try { await db.query('ALTER TABLE permits ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);'); } catch(e){}
  try { await db.query('ALTER TABLE permits ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;'); } catch(e){}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const query = url.parse(req.url, true).query;

  try {
    if (req.method === 'GET') {
      let result;
      try {
        result = await db.query(`
          SELECT permits.id, permits.user_id,
            TO_CHAR(permits.start_date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR(permits.end_date, 'YYYY-MM-DD') AS end_date,
            permits.permit_type, permits.reason, permits.doctor_letter_number,
            permits.status, permits.approved_by, permits.approved_at,
            users.name, users.position
          FROM permits
          JOIN users ON permits.user_id = users.id
          ORDER BY permits.start_date DESC
        `);
      } catch (err) {
        if (err.code === '42P01' || err.message.includes('relation "permits" does not exist')) {
          await ensurePermitsTablePG();
          result = await db.query(`
            SELECT permits.id, permits.user_id,
              TO_CHAR(permits.start_date, 'YYYY-MM-DD') AS start_date,
              TO_CHAR(permits.end_date, 'YYYY-MM-DD') AS end_date,
              permits.permit_type, permits.reason, permits.doctor_letter_number,
              permits.status, permits.approved_by, permits.approved_at,
              users.name, users.position
            FROM permits
            JOIN users ON permits.user_id = users.id
            ORDER BY permits.start_date DESC
          `);
        } else {
          throw err;
        }
      }
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, permits: result.rows }));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const { action, id, user_id, permit_type, start_date, end_date, reason, doctor_letter_number, status, approved_by, approved_at } = body;

      if (action === 'create') {
        try {
          await db.query(
            `INSERT INTO permits (id, user_id, permit_type, start_date, end_date, reason, doctor_letter_number, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
            [id, user_id, permit_type, start_date, end_date, reason || null, doctor_letter_number || null]
          );
        } catch (err) {
          if (err.code === '42P01' || err.message.includes('relation "permits" does not exist')) {
            await ensurePermitsTablePG();
            await db.query(
              `INSERT INTO permits (id, user_id, permit_type, start_date, end_date, reason, doctor_letter_number, status) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
              [id, user_id, permit_type, start_date, end_date, reason || null, doctor_letter_number || null]
            );
          } else {
            throw err;
          }
        }
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true }));
      }

      if (action === 'update') {
        try {
          await db.query(
            `UPDATE permits 
             SET status = $1, approved_by = $2, approved_at = $3 
             WHERE id = $4`,
            [status, approved_by || null, approved_at || null, id]
          );
        } catch (err) {
          if (err.code === '42P01' || err.message.includes('relation "permits" does not exist')) {
            await ensurePermitsTablePG();
            await db.query(
              `UPDATE permits 
               SET status = $1, approved_by = $2, approved_at = $3 
               WHERE id = $4`,
              [status, approved_by || null, approved_at || null, id]
            );
          } else {
            throw err;
          }
        }
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true }));
      }
    }

    if (req.method === 'DELETE') {
      const id = query.id;
      try {
        await db.query('DELETE FROM permits WHERE id = $1', [id]);
      } catch (err) {
        if (err.code === '42P01' || err.message.includes('relation "permits" does not exist')) {
          await ensurePermitsTablePG();
          await db.query('DELETE FROM permits WHERE id = $1', [id]);
        } else {
          throw err;
        }
      }
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true }));
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
};
