const db = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM calendars');
      return res.status(200).json({ success: true, calendars: result.rows });
    }

    if (req.method === 'POST') {
      const { id, date, title, type } = req.body;
      await db.query(
        `INSERT INTO calendars (id, date, title, type) 
         VALUES ($1, $2, $3, $4)`,
        [id, date, title, type]
      );
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await db.query('DELETE FROM calendars WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
