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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const query = url.parse(req.url, true).query;

  try {
    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM users');
      const users = result.rows.map(user => {
        if (user.face_descriptor) {
          user.faceDescriptor = JSON.parse(user.face_descriptor);
        }
        return user;
      });
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, users }));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const { id, name, email, password, role, position, shift, avatar, photo, faceDescriptor } = body;
      const descStr = faceDescriptor ? JSON.stringify(faceDescriptor) : null;
      
      await db.query(
        `INSERT INTO users (id, name, email, password, role, position, shift, avatar, photo, face_descriptor) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, name, email, password, role, position || null, shift || 'siang', avatar, photo || null, descStr]
      );
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true }));
    }

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      const { id, shift } = body;
      await db.query('UPDATE users SET shift = $1 WHERE id = $2', [shift, id]);
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true }));
    }

    if (req.method === 'DELETE') {
      const id = query.id;
      await db.query('DELETE FROM users WHERE id = $1', [id]);
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
