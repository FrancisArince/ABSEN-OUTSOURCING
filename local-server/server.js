const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize SQLite database
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile);

// Create tables based on PRD + Calendar
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      role TEXT,
      email TEXT,
      password TEXT,
      position TEXT,
      avatar TEXT,
      photo TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendances (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      date TEXT,
      check_in_time TEXT,
      check_out_time TEXT,
      photo_url TEXT,
      latitude_longitude TEXT,
      distance REAL,
      face_match REAL,
      status TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS journals (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      date TEXT,
      task_description TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS calendars (
      id TEXT PRIMARY KEY,
      date TEXT,
      title TEXT,
      type TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS permits (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      permit_type TEXT,
      start_date TEXT,
      end_date TEXT,
      reason TEXT,
      doctor_letter_number TEXT,
      status TEXT DEFAULT 'pending',
      approved_by TEXT,
      approved_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);


  // Seed demo admin if not exists
  db.get("SELECT id FROM users WHERE email = 'admin@disdukcapil.go.id'", (err, row) => {
    if (!row) {
      db.run(`
        INSERT INTO users (id, name, role, email, password, position, avatar, photo)
        VALUES (
          'u-admin', 'Budi Santoso', 'admin', 'admin@disdukcapil.go.id', 'admin123', 'Kepala Sub Bagian Tata Usaha', 'BS', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
        )
      `);
    }
  });
});

// Helper: Run query and return promise
const queryGet = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const queryAll = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
const queryRun = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this) }));

// --- API ROUTES ---

// 1. AUTHENTICATION & USERS
app.post(['/api/auth', '/api/login'], async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await queryGet("SELECT * FROM users WHERE email = ?", [email]);
    if (!user || user.password !== password) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    if (role && user.role !== role) return res.status(403).json({ success: false, error: 'Access denied for this role' });
    
    // Parse descriptor if stored
    if (user.face_descriptor) {
      user.faceDescriptor = JSON.parse(user.face_descriptor);
    }
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  const users = await queryAll("SELECT * FROM users");
  res.json({ success: true, users: users.map(user => {
    if (user.face_descriptor) {
      user.faceDescriptor = JSON.parse(user.face_descriptor);
    }
    return user;
  })});
});

app.post('/api/users', async (req, res) => {
  const { id, name, role, email, password, position, shift, avatar, photo, faceDescriptor } = req.body;
  const descStr = faceDescriptor ? JSON.stringify(faceDescriptor) : null;
  await queryRun(
    "INSERT INTO users (id, name, role, email, password, position, shift, avatar, photo, face_descriptor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, name, role, email, password, position || null, shift || 'siang', avatar, photo || null, descStr]
  );
  res.json({ success: true });
});

app.delete(['/api/users', '/api/users/:id'], async (req, res) => {
  const id = req.query.id || req.params.id;
  await queryRun("DELETE FROM users WHERE id = ?", [id]);
  res.json({ success: true });
});

// 2. ATTENDANCES
app.get(['/api/attendances', '/api/attendance'], async (req, res) => {
  const logs = await queryAll("SELECT * FROM attendances ORDER BY check_in_time DESC");
  res.json({ success: true, attendances: logs });
});

app.post(['/api/attendances', '/api/attendance'], async (req, res) => {
  const { action, id, user_id, date, check_in_time, check_out_time, photo_url, distance, latitude_longitude, face_match, status } = req.body;

  if (action === 'checkin') {
    await queryRun(
      `INSERT INTO attendances (id, user_id, date, check_in_time, photo_url, distance, latitude_longitude, face_match, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, date, check_in_time, photo_url || null, distance, latitude_longitude, face_match, status]
    );
    res.json({ success: true });
  } else if (action === 'checkout') {
    await queryRun(
      `UPDATE attendances SET check_out_time = ? WHERE user_id = ? AND date = ?`,
      [check_out_time, user_id, date]
    );
    res.json({ success: true });
  } else {
    // Legacy support
    const todayStr = new Date().toISOString().split('T')[0];
    const timestampStr = new Date().toISOString();
    let record = await queryGet("SELECT * FROM attendances WHERE user_id = ? AND date = ?", [user_id, todayStr]);
    if (!record) {
      const newId = "att-" + Date.now();
      await queryRun(
        `INSERT INTO attendances (id, user_id, date, check_in_time, check_out_time, photo_url, latitude_longitude, distance, face_match, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, user_id, todayStr, check_in_time || timestampStr, check_out_time || null, photo_url, latitude_longitude, distance, face_match, status]
      );
    }
    res.json({ success: true });
  }
});

app.delete(['/api/attendances', '/api/attendance', '/api/attendances/:id', '/api/attendance/:id'], async (req, res) => {
  const id = req.query.id || req.params.id;
  await queryRun("DELETE FROM attendances WHERE id = ?", [id]);
  res.json({ success: true });
});

// 3. JOURNALS
app.get(['/api/journals', '/api/journal'], async (req, res) => {
  const journals = await queryAll("SELECT * FROM journals ORDER BY date DESC");
  res.json({ success: true, journals });
});

app.post(['/api/journals', '/api/journal'], async (req, res) => {
  const { action, id, user_id, date, task_description, verified_by, verified_at } = req.body;
  if (action === 'create') {
    await queryRun(
      "INSERT INTO journals (id, user_id, date, task_description, verified) VALUES (?, ?, ?, ?, 0)",
      [id, user_id, date, task_description]
    );
    res.json({ success: true });
  } else if (action === 'verify') {
    await queryRun(
      "UPDATE journals SET verified = 1, verified_by = ?, verified_at = ? WHERE id = ?",
      [verified_by, verified_at, id]
    );
    res.json({ success: true });
  }
});

app.delete(['/api/journals', '/api/journal', '/api/journals/:id', '/api/journal/:id'], async (req, res) => {
  const id = req.query.id || req.params.id;
  await queryRun("DELETE FROM journals WHERE id = ?", [id]);
  res.json({ success: true });
});

// 4. CALENDARS (HOLIDAYS & LEAVES)
app.get(['/api/calendars', '/api/calendar'], async (req, res) => {
  const cals = await queryAll("SELECT * FROM calendars ORDER BY date DESC");
  res.json({ success: true, calendars: cals });
});

app.post(['/api/calendars', '/api/calendar'], async (req, res) => {
  const { id, date, title, type } = req.body;
  await queryRun("INSERT INTO calendars (id, date, title, type) VALUES (?, ?, ?, ?)", [id || "cal-" + Date.now(), date, title, type]);
  res.json({ success: true });
});

app.delete(['/api/calendars', '/api/calendar', '/api/calendars/:id', '/api/calendar/:id'], async (req, res) => {
  const id = req.query.id || req.params.id;
  await queryRun("DELETE FROM calendars WHERE id = ?", [id]);
  res.json({ success: true });
});

// 5. SETTINGS
app.get(['/api/settings', '/api/setting'], async (req, res) => {
  const rows = await queryAll("SELECT * FROM settings");
  const settings = {};
  rows.forEach(r => {
    settings[r.key] = r.value;
  });
  res.json({ success: true, settings });
});

app.post(['/api/settings', '/api/setting'], async (req, res) => {
  for (const [key, val] of Object.entries(req.body)) {
    const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
    await queryRun(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, valStr]
    );
  }
  res.json({ success: true });
});

// 6. PERMITS
app.get(['/api/permits', '/api/permit'], async (req, res) => {
  const user_id = req.query.user_id;
  let sql = "SELECT permits.*, users.name, users.position FROM permits JOIN users ON permits.user_id = users.id";
  let params = [];
  if (user_id) {
    sql += " WHERE permits.user_id = ?";
    params.push(user_id);
  }
  sql += " ORDER BY permits.start_date DESC";
  const permits = await queryAll(sql, params);
  res.json({ success: true, permits });
});

app.post(['/api/permits', '/api/permit'], async (req, res) => {
  const { action, id, user_id, permit_type, start_date, end_date, reason, doctor_letter_number, status, approved_by, approved_at } = req.body;
  if (action === 'create') {
    await queryRun(
      "INSERT INTO permits (id, user_id, permit_type, start_date, end_date, reason, doctor_letter_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, user_id, permit_type, start_date, end_date, reason || null, doctor_letter_number || null, 'pending']
    );
    res.json({ success: true });
  } else if (action === 'update') {
    await queryRun(
      "UPDATE permits SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?",
      [status, approved_by || null, approved_at || null, id]
    );
    res.json({ success: true });
  }
});

app.delete(['/api/permits', '/api/permit', '/api/permits/:id', '/api/permit/:id'], async (req, res) => {
  const id = req.query.id || req.params.id;
  await queryRun("DELETE FROM permits WHERE id = ?", [id]);
  res.json({ success: true });
});

// 5. EXPORT JOURNAL TO PDF
app.get('/api/reports/journal-pdf/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query; // ?month=05&year=2026
    
    const user = await queryGet("SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) return res.status(404).send("User not found");
    
    // Filter journals by month/year
    const journals = await queryAll("SELECT * FROM journals WHERE user_id = ? ORDER BY date ASC", [userId]);
    const filteredJournals = journals.filter(j => j.date.startsWith(`${year}-${month}`));

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-disposition', `attachment; filename="Jurnal_Harian_${user.name.replace(/\s+/g, '_')}_${year}-${month}.pdf"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Header
    doc.fontSize(18).text('Laporan Jurnal Harian Pekerjaan', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Nama Lengkap: ${user.name}`);
    doc.text(`Jabatan: ${user.position}`);
    doc.text(`Periode: ${month}/${year}`);
    doc.moveDown(2);

    if (filteredJournals.length === 0) {
      doc.text("Tidak ada catatan jurnal pada periode ini.", { align: 'center' });
    } else {
      filteredJournals.forEach(j => {
        doc.fontSize(12).font('Helvetica-Bold').text(`Tanggal: ${j.date}`);
        doc.fontSize(11).font('Helvetica').text(j.task_description);
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown();
      });
    }

    doc.end();
  } catch (error) {
    res.status(500).send("Error generating PDF: " + error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
