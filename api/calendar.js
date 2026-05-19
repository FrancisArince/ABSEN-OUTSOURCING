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
      const result = await db.query('SELECT * FROM calendars');
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, calendars: result.rows }));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const { id, date, title, type } = body;
      await db.query(
        `INSERT INTO calendars (id, date, title, type) 
         VALUES ($1, $2, $3, $4)`,
        [id, date, title, type]
      );
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true }));
    }

    if (req.method === 'DELETE') {
      const id = query.id;
      await db.query('DELETE FROM calendars WHERE id = $1', [id]);
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
