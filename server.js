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
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await queryGet("SELECT * FROM users WHERE email = ?", [email]);
    if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.role !== role) return res.status(403).json({ error: 'Access denied for this role' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  const users = await queryAll("SELECT * FROM users");
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const { id, name, role, email, password, position, avatar, photo } = req.body;
  await queryRun(
    "INSERT INTO users (id, name, role, email, password, position, avatar, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, name, role, email, password, position, avatar, photo]
  );
  res.json({ success: true });
});

app.delete('/api/users/:id', async (req, res) => {
  await queryRun("DELETE FROM users WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// 2. ATTENDANCES
app.get('/api/attendances', async (req, res) => {
  const logs = await queryAll("SELECT * FROM attendances");
  res.json(logs);
});

app.post('/api/attendances', async (req, res) => {
  const { user_id, type, photo_url, latitude_longitude, distance, face_match, status } = req.body;
  const todayStr = new Date().toISOString().split('T')[0];
  const timestampStr = new Date().toISOString();
  
  let record = await queryGet("SELECT * FROM attendances WHERE user_id = ? AND date = ?", [user_id, todayStr]);
  
  if (!record) {
    const newId = "att-" + Date.now();
    await queryRun(
      `INSERT INTO attendances (id, user_id, date, check_in_time, check_out_time, photo_url, latitude_longitude, distance, face_match, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, user_id, todayStr, type === 'in' ? timestampStr : null, type === 'out' ? timestampStr : null, photo_url, latitude_longitude, distance, face_match, status]
    );
    record = await queryGet("SELECT * FROM attendances WHERE id = ?", [newId]);
  } else {
    if (type === 'in') {
      await queryRun(
        "UPDATE attendances SET check_in_time = ?, photo_url = ?, latitude_longitude = ?, distance = ?, face_match = ?, status = ? WHERE id = ?",
        [timestampStr, photo_url, latitude_longitude, distance, face_match, status, record.id]
      );
    } else {
      await queryRun("UPDATE attendances SET check_out_time = ? WHERE id = ?", [timestampStr, record.id]);
    }
    record = await queryGet("SELECT * FROM attendances WHERE id = ?", [record.id]);
  }
  res.json(record);
});

// 3. JOURNALS
app.get('/api/journals', async (req, res) => {
  const journals = await queryAll("SELECT * FROM journals");
  res.json(journals);
});

app.post('/api/journals', async (req, res) => {
  const { user_id, task_description } = req.body;
  const todayStr = new Date().toISOString().split('T')[0];
  
  let journal = await queryGet("SELECT * FROM journals WHERE user_id = ? AND date = ?", [user_id, todayStr]);
  if (!journal) {
    const newId = "jr-" + Date.now();
    await queryRun(
      "INSERT INTO journals (id, user_id, date, task_description) VALUES (?, ?, ?, ?)",
      [newId, user_id, todayStr, task_description]
    );
    journal = { id: newId, user_id, date: todayStr, task_description };
  } else {
    await queryRun("UPDATE journals SET task_description = ? WHERE id = ?", [task_description, journal.id]);
    journal.task_description = task_description;
  }
  res.json(journal);
});

// 4. CALENDARS (HOLIDAYS & LEAVES)
app.get('/api/calendars', async (req, res) => {
  const cals = await queryAll("SELECT * FROM calendars");
  res.json(cals);
});

app.post('/api/calendars', async (req, res) => {
  const { date, title, type } = req.body;
  const newId = "cal-" + Date.now();
  await queryRun("INSERT INTO calendars (id, date, title, type) VALUES (?, ?, ?, ?)", [newId, date, title, type]);
  res.json({ success: true, id: newId });
});

app.delete('/api/calendars/:id', async (req, res) => {
  await queryRun("DELETE FROM calendars WHERE id = ?", [req.params.id]);
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
