const db = require('./db');

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
      const result = await db.query('SELECT * FROM settings');
      const settings = {};
      result.rows.forEach(row => {
        settings[row.key] = row.value;
      });
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, settings }));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      
      for (const [key, val] of Object.entries(body)) {
        const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
        await db.query(
          `INSERT INTO settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, valStr]
        );
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
