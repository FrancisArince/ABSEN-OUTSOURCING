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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  try {
    if (req.method === 'GET') {
      const result = await db.query(`
        SELECT id, user_id,
          TO_CHAR(date, 'YYYY-MM-DD') AS date,
          task_description, verified, verified_by, verified_at
        FROM journals
        ORDER BY date DESC
      `);
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, journals: result.rows }));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const { action, id, user_id, date, task_description, verified_by, verified_at } = body;

      if (action === 'create') {
        await db.query(
          `INSERT INTO journals (id, user_id, date, task_description, verified) 
           VALUES ($1, $2, $3, $4, FALSE)`,
          [id, user_id, date, task_description]
        );
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true }));
      }

      if (action === 'verify') {
        await db.query(
          `UPDATE journals 
           SET verified = TRUE, verified_by = $1, verified_at = $2 
           WHERE id = $3`,
          [verified_by, verified_at, id]
        );
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true }));
      }
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
};
