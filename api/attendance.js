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
      // Use TO_CHAR to return date as plain YYYY-MM-DD string (avoids UTC timezone shift)
      const result = await db.query(`
        SELECT 
          id, user_id, 
          TO_CHAR(date, 'YYYY-MM-DD') AS date,
          check_in_time, check_out_time,
          photo_url, distance, latitude_longitude, face_match, status
        FROM attendances
        ORDER BY check_in_time DESC
      `);
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, attendances: result.rows }));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const { action, id, user_id, date, check_in_time, check_out_time, photo_url, distance, latitude_longitude, face_match, status } = body;

      if (action === 'checkin') {
        await db.query(
          `INSERT INTO attendances (id, user_id, date, check_in_time, photo_url, distance, latitude_longitude, face_match, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [id, user_id, date, check_in_time, photo_url || null, distance, latitude_longitude, face_match, status]
        );
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true }));
      }

      if (action === 'checkout') {
        await db.query(
          `UPDATE attendances 
           SET check_out_time = $1 
           WHERE user_id = $2 AND date = $3`,
          [check_out_time, user_id, date]
        );
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true }));
      }
    }

    if (req.method === 'DELETE') {
      const id = query.id;
      await db.query('DELETE FROM attendances WHERE id = $1', [id]);
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
