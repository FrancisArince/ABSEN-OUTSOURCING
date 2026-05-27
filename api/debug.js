const db = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const attendances = await db.query(`
      SELECT id, user_id, TO_CHAR(date, 'YYYY-MM-DD') AS date, 
             check_in_time, check_out_time, distance, status,
             CASE WHEN photo_url IS NOT NULL THEN 'YES (' || LENGTH(photo_url) || ' chars)' ELSE 'NO' END AS has_photo
      FROM attendances 
      ORDER BY check_in_time DESC 
      LIMIT 20
    `);
    
    const users = await db.query('SELECT id, name, role FROM users');
    const journals = await db.query(`
      SELECT id, user_id, TO_CHAR(date, 'YYYY-MM-DD') AS date, verified 
      FROM journals ORDER BY date DESC LIMIT 20
    `);

    let permits = [];
    let permitsError = null;
    try {
      const permitsRes = await db.query('SELECT * FROM permits LIMIT 20');
      permits = permitsRes.rows;
    } catch (e) {
      permitsError = e.message;
    }

    const tableInfo = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'attendances' 
      ORDER BY ordinal_position
    `);

    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      server_time_utc: new Date().toISOString(),
      attendances_count: attendances.rows.length,
      attendances: attendances.rows,
      users_count: users.rows.length,
      users: users.rows,
      journals_count: journals.rows.length,
      journals: journals.rows,
      permits_count: Array.isArray(permits) ? permits.length : 0,
      permits: permits,
      permits_error: permitsError,
      attendances_table_columns: tableInfo.rows
    }, null, 2));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message, stack: error.stack }));
  }
};
