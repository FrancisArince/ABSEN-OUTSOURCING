const db = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const { email, password } = req.body;
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      const user = result.rows[0];
      if (user.password !== password) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
      
      // Parse descriptor if stored
      if (user.face_descriptor) {
        user.faceDescriptor = JSON.parse(user.face_descriptor);
      }

      return res.status(200).json({ success: true, user });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
