const db = require('./db');

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
    // 1. Create tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        position VARCHAR(100),
        shift VARCHAR(20),
        avatar VARCHAR(10),
        photo TEXT,
        face_descriptor TEXT
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS attendances (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        check_in_time TIMESTAMP NOT NULL,
        check_out_time TIMESTAMP,
        photo_url TEXT,
        distance NUMERIC,
        latitude_longitude VARCHAR(100),
        face_match NUMERIC,
        status VARCHAR(50)
      );
    `);

    // Migration: add photo_url column if it doesn't exist (for existing databases)
    await db.query(`
      ALTER TABLE attendances ADD COLUMN IF NOT EXISTS photo_url TEXT;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS journals (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        task_description TEXT NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        verified_by VARCHAR(100),
        verified_at TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS calendars (
        id VARCHAR(50) PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        title VARCHAR(150) NOT NULL,
        type VARCHAR(50)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS permits (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        permit_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        doctor_letter_number VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        approved_by VARCHAR(100),
        approved_at TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Seed settings if empty
    const settingsCheck = await db.query('SELECT COUNT(*) FROM settings');
    if (parseInt(settingsCheck.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO settings (key, value) VALUES 
        ('office_lat', '-0.626305'),
        ('office_lng', '114.589139'),
        ('shift_config', '{"siang":{"in":"08:00","out":"16:00"},"malam":{"in":"20:00","out":"04:00"}}')
      `);
    }

    // 2. Seed default users if empty
    const userCheck = await db.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) === 0) {
      const MOCK_USERS = [
        {
          id: "u-1",
          name: "John Doe",
          email: "karyawan@disdukcapil.go.id",
          password: "password123",
          role: "karyawan",
          avatar: "JD",
          position: "Staf Teknis Lapangan",
          photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150"
        },
        {
          id: "u-2",
          name: "Sarah Amelia",
          email: "sarah.amelia@disdukcapil.go.id",
          password: "password123",
          role: "karyawan",
          avatar: "SA",
          position: "Staf Administrasi & Pelayanan",
          photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
        },
        {
          id: "admin-1",
          name: "Francis Arince Victory",
          email: "admin@disdukcapil.go.id",
          password: "130623@!",
          role: "admin",
          avatar: "FA"
        }
      ];

      for (const u of MOCK_USERS) {
        await db.query(
          `INSERT INTO users (id, name, email, password, role, position, shift, avatar, photo, face_descriptor) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [u.id, u.name, u.email, u.password, u.role, u.position || null, u.shift || 'siang', u.avatar, u.photo || null, null]
        );
      }

      // Seed attendances
      const MOCK_ATTENDANCES = [
        {
          id: "att-1",
          user_id: "u-1",
          date: "2026-05-18",
          check_in_time: "2026-05-18T07:43:12+07:00",
          check_out_time: "2026-05-18T16:05:22+07:00",
          latitude_longitude: "-0.626210, 114.589100",
          distance: 12,
          face_match: 99.4,
          status: "Hadir"
        },
        {
          id: "att-2",
          user_id: "u-2",
          date: "2026-05-18",
          check_in_time: "2026-05-18T08:12:45+07:00",
          check_out_time: "2026-05-18T16:02:10+07:00",
          latitude_longitude: "-0.626150, 114.589250",
          distance: 21,
          face_match: 98.1,
          status: "Terlambat"
        }
      ];

      for (const att of MOCK_ATTENDANCES) {
        await db.query(
          `INSERT INTO attendances (id, user_id, date, check_in_time, check_out_time, distance, latitude_longitude, face_match, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [att.id, att.user_id, att.date, att.check_in_time, att.check_out_time, att.distance, att.latitude_longitude, att.face_match, att.status]
        );
      }

      // Seed journals
      const MOCK_JOURNALS = [
        {
          id: "jr-1",
          user_id: "u-1",
          date: "2026-05-18",
          task_description: "1. Melakukan monitoring jaringan intranet Disdukcapil.\n2. Mengganti kabel switch LAN lantai 2 yang korosi.\n3. Membantu troubleshooting server database KTP SIAK."
        },
        {
          id: "jr-2",
          user_id: "u-2",
          date: "2026-05-18",
          task_description: "1. Melayani pencatatan 18 Kartu Keluarga baru.\n2. Menyortir berkas pencatatan kematian dari kecamatan Puruk Cahu.\n3. Pengarsipan dokumen SIAK fisik periode April."
        }
      ];

      for (const j of MOCK_JOURNALS) {
        await db.query(
          `INSERT INTO journals (id, user_id, date, task_description) VALUES ($1, $2, $3, $4)`,
          [j.id, j.user_id, j.date, j.task_description]
        );
      }
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: "Database initialized successfully" }));
  } catch (error) {
    console.error("DB Setup Error:", error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
};
