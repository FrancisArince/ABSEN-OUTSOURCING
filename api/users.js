const db = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM users');
      const users = result.rows.map(user => {
        if (user.face_descriptor) {
          user.faceDescriptor = JSON.parse(user.face_descriptor);
        }
        return user;
      });
      return res.status(200).json({ success: true, users });
    }

    if (req.method === 'POST') {
      const { id, name, email, password, role, position, shift, avatar, photo, faceDescriptor } = req.body;
      const descStr = faceDescriptor ? JSON.stringify(faceDescriptor) : null;
      
      await db.query(
        `INSERT INTO users (id, name, email, password, role, position, shift, avatar, photo, face_descriptor) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, name, email, password, role, position || null, shift || 'siang', avatar, photo || null, descStr]
      );
      return res.status(200).json({ success: true });
    }

    if (req.method === 'PUT') {
      // Used to update shift
      const { id, shift } = req.body;
      await db.query('UPDATE users SET shift = $1 WHERE id = $2', [shift, id]);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await db.query('DELETE FROM users WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
