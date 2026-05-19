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
      const result = await db.query('SELECT * FROM attendances');
      return res.status(200).json({ success: true, attendances: result.rows });
    }

    if (req.method === 'POST') {
      const { action, id, user_id, date, check_in_time, check_out_time, distance, latitude_longitude, face_match, status } = req.body;

      if (action === 'checkin') {
        await db.query(
          `INSERT INTO attendances (id, user_id, date, check_in_time, distance, latitude_longitude, face_match, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, user_id, date, check_in_time, distance, latitude_longitude, face_match, status]
        );
        return res.status(200).json({ success: true });
      }

      if (action === 'checkout') {
        await db.query(
          `UPDATE attendances 
           SET check_out_time = $1 
           WHERE user_id = $2 AND date = $3`,
          [check_out_time, user_id, date]
        );
        return res.status(200).json({ success: true });
      }
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await db.query('DELETE FROM attendances WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
