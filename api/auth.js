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
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;
      
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ success: false, error: 'User not found' }));
      }
      
      const user = result.rows[0];
      if (user.password !== password) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ success: false, error: 'Invalid password' }));
      }
      
      // Parse descriptor if stored
      if (user.face_descriptor) {
        user.faceDescriptor = JSON.parse(user.face_descriptor);
      }

      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, user }));
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
};
