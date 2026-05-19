const db = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM journals');
      return res.status(200).json({ success: true, journals: result.rows });
    }

    if (req.method === 'POST') {
      const { action, id, user_id, date, task_description, verified_by, verified_at } = req.body;

      if (action === 'create') {
        await db.query(
          `INSERT INTO journals (id, user_id, date, task_description, verified) 
           VALUES ($1, $2, $3, $4, FALSE)`,
          [id, user_id, date, task_description]
        );
        return res.status(200).json({ success: true });
      }

      if (action === 'verify') {
        await db.query(
          `UPDATE journals 
           SET verified = TRUE, verified_by = $1, verified_at = $2 
           WHERE id = $3`,
          [verified_by, verified_at, id]
        );
        return res.status(200).json({ success: true });
      }
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
