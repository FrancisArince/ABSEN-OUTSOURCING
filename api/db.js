const { Pool, types } = require('pg');

// Override pg's default DATE type parser (OID 1082)
// By default pg converts DATE to a JS Date object at UTC midnight,
// which shifts to the previous day for WIB (UTC+7).
// This override returns DATE fields as plain YYYY-MM-DD strings.
types.setTypeParser(1082, (val) => val); // DATE → string as-is

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Neon requires SSL connection
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
