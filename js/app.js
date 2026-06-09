/* 
========================================================================
   APP.JS - APPLICATION LOGIC, BIOMETRICS ENGINE & REAL-TIME DASHBOARD
   Disdukcapil Kabupaten Murung Raya - Outsourcing Attendance System
========================================================================
*/

// --- 1. LOCAL DATABASE & SEED SEED DATA ---
let OFFICE_LAT = parseFloat(localStorage.getItem("admin_office_lat")) || -0.626305;
let OFFICE_LNG = parseFloat(localStorage.getItem("admin_office_lng")) || 114.589139;
const OFFICE_RADIUS = 150; // meters

let SHIFT_CONFIG = JSON.parse(localStorage.getItem("admin_shift_config")) || {
  siang: { in: "08:00", out: "15:30" },
  malam: { in: "20:00", out: "04:00" }
};

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

const MOCK_ATTENDANCES_SEED = [
  {
    id: "att-1",
    user_id: "u-1",
    date: "2026-05-18",
    check_in_time: "2026-05-18T07:43:12+07:00",
    check_out_time: "2026-05-18T16:05:22+07:00",
    photo_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300",
    latitude_longitude: "-0.626210, 114.589100",
    distance: 12, // meters
    face_match: 99.4,
    status: "Hadir"
  },
  {
    id: "att-2",
    user_id: "u-2",
    date: "2026-05-18",
    check_in_time: "2026-05-18T08:12:45+07:00",
    check_out_time: "2026-05-18T16:02:10+07:00",
    photo_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
    latitude_longitude: "-0.626150, 114.589250",
    distance: 21,
    face_match: 98.1,
    status: "Terlambat"
  },
  {
    id: "att-3",
    user_id: "u-1",
    date: "2026-05-17",
    check_in_time: "2026-05-17T07:38:15+07:00",
    check_out_time: "2026-05-17T16:00:04+07:00",
    photo_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300",
    latitude_longitude: "-0.626280, 114.589120",
    distance: 3,
    face_match: 99.2,
    status: "Hadir"
  },
  {
    id: "att-4",
    user_id: "u-2",
    date: "2026-05-17",
    check_in_time: "2026-05-17T07:54:30+07:00",
    check_out_time: "2026-05-17T16:11:55+07:00",
    photo_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
    latitude_longitude: "-0.641500, 114.568300", // far away
    distance: 2840, // 2.8 km out
    face_match: 97.8,
    status: "Luar Radius"
  }
];

const MOCK_JOURNALS_SEED = [
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
  },
  {
    id: "jr-3",
    user_id: "u-1",
    date: "2026-05-17",
    task_description: "1. Pemeliharaan rutin AC ruang server utama.\n2. Pengetesan genset cadangan Disdukcapil (Running 1 jam normal).\n3. Memperbaiki printer thermal loket cetak KIA."
  },
  {
    id: "jr-4",
    user_id: "u-2",
    date: "2026-05-17",
    task_description: "1. Memproses permohonan legalisir Akta Kelahiran (35 berkas).\n2. Membantu entri data surat masuk dan keluar.\n3. Melayani konseling pengaduan NIK ganda di meja layanan informasi."
  }
];

// Initialize database with local storage sync
class AppDatabase {
  constructor() {
    this.users = [];
    this.attendances = [];
    this.journals = [];
    this.calendars = [];
    this.permits = [];

    // Shadow copies to track changes
    this._serverUsers = [];
    this._serverAttendances = [];
    this._serverJournals = [];
    this._serverCalendars = [];
    this._serverPermits = [];
  }

  async syncFromBackend() {
    // 1. Users
    try {
      const resUsers = await fetch('/api/users').then(r => r.json());
      if (resUsers && resUsers.success) {
        this.users = resUsers.users;
        this._serverUsers = JSON.parse(JSON.stringify(this.users));
      }
    } catch (err) {
      console.error("Failed to sync users:", err);
    }

    // 2. Attendances
    try {
      const resAttendances = await fetch('/api/attendance').then(r => r.json());
      if (resAttendances && resAttendances.success) {
        this.attendances = resAttendances.attendances;
        this._serverAttendances = JSON.parse(JSON.stringify(this.attendances));
      }
    } catch (err) {
      console.error("Failed to sync attendances:", err);
    }

    // 3. Journals
    try {
      const resJournals = await fetch('/api/journal').then(r => r.json());
      if (resJournals && resJournals.success) {
        // Automatically clean up orphaned journals that have no matching attendance record
        const validJournals = resJournals.journals.filter(j => 
          this.attendances.some(a => a.user_id === j.user_id && a.date === j.date)
        );
        
        const orphaned = resJournals.journals.filter(j => 
          !this.attendances.some(a => a.user_id === j.user_id && a.date === j.date)
        );
        
        for (const oj of orphaned) {
          console.warn(`Cleaning up orphaned journal ${oj.id} (user: ${oj.user_id}, date: ${oj.date})`);
          fetch(`/api/journal?id=${oj.id}`, { method: 'DELETE' }).catch(err => console.error(err));
        }

        this.journals = validJournals;
        this._serverJournals = JSON.parse(JSON.stringify(this.journals));
      }
    } catch (err) {
      console.error("Failed to sync journals:", err);
    }

    // 4. Calendars
    try {
      const resCalendars = await fetch('/api/calendar').then(r => r.json());
      if (resCalendars && resCalendars.success) {
        this.calendars = resCalendars.calendars;
        this._serverCalendars = JSON.parse(JSON.stringify(this.calendars));
      }
    } catch (err) {
      console.error("Failed to sync calendars:", err);
    }

    // 5. Permits
    try {
      const resPermits = await fetch('/api/permit').then(r => r.json());
      if (resPermits && resPermits.success) {
        this.permits = resPermits.permits;
        this._serverPermits = JSON.parse(JSON.stringify(this.permits));
      } else {
        console.error("Failed to load permits from backend:", resPermits ? resPermits.error : "Unknown error");
      }
    } catch (err) {
      console.error("Failed to sync permits:", err);
    }

    // 6. Settings
    try {
      const resSettings = await fetch('/api/settings').then(r => r.json());
      if (resSettings && resSettings.success && resSettings.settings) {
        const s = resSettings.settings;
        if (s.office_lat) {
          OFFICE_LAT = parseFloat(s.office_lat);
          localStorage.setItem("admin_office_lat", s.office_lat);
        }
        if (s.office_lng) {
          OFFICE_LNG = parseFloat(s.office_lng);
          localStorage.setItem("admin_office_lng", s.office_lng);
        }
        if (s.shift_config) {
          SHIFT_CONFIG = JSON.parse(s.shift_config);
          localStorage.setItem("admin_shift_config", s.shift_config);
        }
        // Force refresh UI values if inputs are loaded
        if (DOM.adminOfficeLat) DOM.adminOfficeLat.value = OFFICE_LAT;
        if (DOM.adminOfficeLng) DOM.adminOfficeLng.value = OFFICE_LNG;
        if (DOM.adminShiftSiangIn) {
          DOM.adminShiftSiangIn.value = SHIFT_CONFIG.siang.in;
          DOM.adminShiftSiangOut.value = SHIFT_CONFIG.siang.out;
          DOM.adminShiftMalamIn.value = SHIFT_CONFIG.malam.in;
          DOM.adminShiftMalamOut.value = SHIFT_CONFIG.malam.out;
        }
      }
    } catch (err) {
      console.error("Failed to sync settings:", err);
    }

    // 7. Self-heal: Clean up orphaned permit attendance records
    let hasOrphans = false;
    this.attendances = this.attendances.filter(a => {
      if (['Izin', 'Sakit', 'Cuti', 'Mengantar Kepala Dinas'].includes(a.status)) {
        const hasApprovedPermit = this.permits.some(p => 
          p.user_id === a.user_id && 
          p.status === 'approved' && 
          a.date >= p.start_date && 
          a.date <= p.end_date
        );
        if (!hasApprovedPermit) {
          console.warn(`Self-heal: Removing orphaned attendance log ${a.id} (status: ${a.status}, date: ${a.date})`);
          hasOrphans = true;
          return false;
        }
      }
      return true;
    });
    
    if (hasOrphans) {
      await this.save();
    }
  }

  async save() {
    // 1. Users Differential Sync
    // Added
    for (const u of this.users) {
      const exists = this._serverUsers.some(su => su.id === u.id);
      if (!exists) {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(u)
        });
      } else {
        // Check if modified (e.g. shift updated)
        const su = this._serverUsers.find(su => su.id === u.id);
        if (su.shift !== u.shift) {
          await fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: u.id, shift: u.shift })
          });
        }
      }
    }
    // Deleted
    for (const su of this._serverUsers) {
      const stillExists = this.users.some(u => u.id === su.id);
      if (!stillExists) {
        await fetch(`/api/users?id=${su.id}`, { method: 'DELETE' });
      }
    }

    // 2. Attendances Differential Sync
    for (const a of this.attendances) {
      const sa = this._serverAttendances.find(s => s.id === a.id);
      if (!sa) {
        // Brand new checkin - strip photo_url if too large for Vercel payload limit
        const payload = { action: 'checkin', ...a };
        if (payload.photo_url && payload.photo_url.length > 500000) {
          // Photo too large (>500KB), save without photo to ensure record is stored
          console.warn(`Attendance ${a.id}: photo_url too large (${payload.photo_url.length} chars), saving without photo.`);
          payload.photo_url = null;
        }
        try {
          const resp = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await resp.json();
          if (!result.success) {
            console.error(`Failed to save attendance ${a.id}:`, result.error);
          }
        } catch (err) {
          console.error(`Network error saving attendance ${a.id}:`, err);
        }
      } else if (sa.check_out_time !== a.check_out_time) {
        // Updated checkout
        try {
          await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'checkout', ...a, photo_url: undefined })
          });
        } catch (err) {
          console.error(`Network error saving checkout ${a.id}:`, err);
        }
      }
    }
    for (const sa of this._serverAttendances) {
      const stillExists = this.attendances.some(a => a.id === sa.id);
      if (!stillExists) {
        await fetch(`/api/attendance?id=${sa.id}`, { method: 'DELETE' });
      }
    }

    // 3. Journals Differential Sync
    for (const j of this.journals) {
      const sj = this._serverJournals.find(s => s.id === j.id);
      if (!sj) {
        // Brand new journal
        await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', ...j })
        });
      } else if (!sj.verified && j.verified) {
        // Journal verified
        await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', ...j })
        });
      }
    }
    for (const sj of this._serverJournals) {
      const stillExists = this.journals.some(j => j.id === sj.id);
      if (!stillExists) {
        await fetch(`/api/journal?id=${sj.id}`, { method: 'DELETE' });
      }
    }

    // 4. Calendars Differential Sync
    for (const c of this.calendars) {
      const sc = this._serverCalendars.some(s => s.id === c.id);
      if (!sc) {
        await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(c)
        });
      }
    }
    for (const sc of this._serverCalendars) {
      const stillExists = this.calendars.some(c => c.id === sc.id);
      if (!stillExists) {
        await fetch(`/api/calendar?id=${sc.id}`, { method: 'DELETE' });
      }
    }

    // 5. Permits Differential Sync
    const successfullySyncedPermitIds = new Set(this._serverPermits.map(s => s.id));
    for (const p of this.permits) {
      const sp = this._serverPermits.find(s => s.id === p.id);
      try {
        if (!sp) {
          const resp = await fetch('/api/permit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', ...p })
          });
          const resJson = await resp.json();
          if (resJson && resJson.success) {
            successfullySyncedPermitIds.add(p.id);
          } else {
            console.error("Failed to save permit:", resJson.error);
            showToast("Sinkronisasi Gagal", `Gagal menyimpan pengajuan: ${resJson.error || 'Server error'}`, "error");
          }
        } else if (sp.status !== p.status) {
          const resp = await fetch('/api/permit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', ...p })
          });
          const resJson = await resp.json();
          if (resJson && resJson.success) {
            const idx = this._serverPermits.findIndex(s => s.id === p.id);
            if (idx !== -1) this._serverPermits[idx].status = p.status;
          } else {
            console.error("Failed to update permit:", resJson.error);
            showToast("Sinkronisasi Gagal", `Gagal memperbarui status pengajuan: ${resJson.error || 'Server error'}`, "error");
          }
        }
      } catch (err) {
        console.error("Network error syncing permit:", err);
        showToast("Error Koneksi", "Gagal menghubungi server untuk menyimpan data pengajuan.", "error");
      }
    }
    for (const sp of this._serverPermits) {
      const stillExists = this.permits.some(p => p.id === sp.id);
      if (!stillExists) {
        try {
          const resp = await fetch(`/api/permit?id=${sp.id}`, { method: 'DELETE' });
          const resJson = await resp.json();
          if (resJson && resJson.success) {
            this._serverPermits = this._serverPermits.filter(s => s.id !== sp.id);
          }
        } catch (err) {
          console.error("Network error deleting permit:", err);
        }
      }
    }

    // Update shadow copies
    this._serverUsers = JSON.parse(JSON.stringify(this.users));
    this._serverAttendances = JSON.parse(JSON.stringify(this.attendances));
    this._serverJournals = JSON.parse(JSON.stringify(this.journals));
    this._serverCalendars = JSON.parse(JSON.stringify(this.calendars));
    this._serverPermits = this.permits.filter(p => successfullySyncedPermitIds.has(p.id) || this._serverPermits.some(s => s.id === p.id && s.status === p.status));
  }

  getUserByEmail(email) {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getAttendanceLogs(userId) {
    return this.attendances
      .filter(a => a.user_id === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getTodayAttendance(userId) {
    const todayStr = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
    return this.attendances.find(a => a.user_id === userId && a.date === todayStr);
  }

  getTodayJournal(userId) {
    const todayStr = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
    return this.journals.find(j => j.user_id === userId && j.date === todayStr);
  }

  saveTodayAttendance(userId, checkType, photoBase64, coords, distance, faceMatch, status) {
    const todayStr = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
    const timestampStr = new Date().toISOString();
    let todayRecord = this.getTodayAttendance(userId);

    if (!todayRecord) {
      todayRecord = {
        id: "att-" + Date.now(),
        user_id: userId,
        date: todayStr,
        check_in_time: checkType === 'in' ? timestampStr : null,
        check_out_time: checkType === 'out' ? timestampStr : null,
        photo_url: photoBase64,
        latitude_longitude: coords,
        distance: distance,
        face_match: faceMatch,
        status: status
      };
      this.attendances.push(todayRecord);
    } else {
      if (checkType === 'in') {
        todayRecord.check_in_time = timestampStr;
        todayRecord.photo_url = photoBase64;
        todayRecord.latitude_longitude = coords;
        todayRecord.distance = distance;
        todayRecord.face_match = faceMatch;
        todayRecord.status = status;
      } else {
        todayRecord.check_out_time = timestampStr;
        if (status === 'Pulang Lebih Awal' || status === 'Luar Radius') {
          todayRecord.status = status;
        }
      }
    }
    this.save();
    return todayRecord;
  }

  saveTodayJournal(userId, description) {
    const todayStr = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
    let todayJournal = this.getTodayJournal(userId);

    if (!todayJournal) {
      todayJournal = {
        id: "jr-" + Date.now(),
        user_id: userId,
        date: todayStr,
        task_description: description,
        verified: false,
        verified_by: null,
        verified_at: null
      };
      this.journals.push(todayJournal);
    } else {
      todayJournal.task_description = description;
    }
    this.save();
    return todayJournal;
  }

  verifyJournal(journalId, verifierName) {
    const journal = this.journals.find(j => j.id === journalId);
    if (!journal) return null;
    journal.verified = true;
    journal.verified_by = verifierName;
    journal.verified_at = new Date().toISOString();
    this.save();
    return journal;
  }
}

const db = new AppDatabase();

// --- LOGO PRELOADER FOR PDF ---
let LOGO_BASE64 = null;
(function preloadLogo() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    LOGO_BASE64 = canvas.toDataURL('image/png');
  };
  img.onerror = function() {
    console.warn('Logo Murung Raya gagal dimuat untuk PDF.');
  };
  img.src = 'logo_murungraya.png';
})();

// --- 2. APPLICATION STATE ---
const state = {
  currentUser: null,
  currentLat: null,
  currentLng: null,
  currentAccuracy: null, // meters
  gpsDistance: null,
  gpsStatus: "Memeriksa...", // "in-radius", "out-radius"

  // Fake GPS Detection
  fakeGpsDetected: false,
  fakeGpsReason: "",
  gpsLastReading: null, // { lat, lng, ts }
  gpsReadings: [],      // array of {lat, lng, ts, accuracy} for analysis

  webcamActive: false,
  stream: null,
  biometricVerified: false,
  livenessChallengeActive: false,
  livenessChallengeProgress: 0,
  currentLivenessPrompt: "",
  
  leafletMaps: {
    employee: null,
    employeeUserMarker: null,
    admin: null,
    adminMarkers: []
  },
  
  charts: {
    statusDoughnut: null,
    trendsLine: null
  }
};

// --- 3. DOM ELEMENT REFERENCES ---
const DOM = {
  clockTime: document.getElementById("clock-time"),
  userProfileBadge: document.getElementById("user-profile-badge"),
  navAvatar: document.getElementById("nav-avatar"),
  navAvatarInitials: document.getElementById("nav-avatar-initials"),
  navUserName: document.getElementById("nav-user-name"),
  navUserRole: document.getElementById("nav-user-role"),
  btnLogout: document.getElementById("btn-logout"),
  
  // Views
  viewLogin: document.getElementById("view-login"),
  viewKaryawan: document.getElementById("view-karyawan"),
  viewAdmin: document.getElementById("view-admin"),
  
  // Login form
  loginForm: document.getElementById("login-form"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  togglePassword: document.getElementById("toggle-password"),
  demoKaryawan1: document.getElementById("demo-karyawan-1"),
  demoKaryawan2: document.getElementById("demo-karyawan-2"),
  demoAdmin: document.getElementById("demo-admin"),
  
  // Employee View Components
  employeeWelcomeTitle: document.getElementById("employee-welcome-title"),
  widgetCheckInTime: document.getElementById("widget-checkin-time"),
  widgetCheckInStatus: document.getElementById("widget-checkin-status"),
  widgetCheckOutTime: document.getElementById("widget-checkout-time"),
  widgetCheckOutStatus: document.getElementById("widget-checkout-status"),
  widgetGpsDistance: document.getElementById("widget-gps-distance"),
  widgetGpsStatus: document.getElementById("widget-gps-status"),
  
  // Terminal Camera
  webcamStream: document.getElementById("webcam-stream"),
  biometricCanvas: document.getElementById("biometric-canvas"),
  cameraFallback: document.getElementById("camera-fallback"),
  btnActivateCamera: document.getElementById("btn-activate-camera"),
  scanningLaser: document.getElementById("scanning-laser"),
  livenessChallengeBox: document.getElementById("liveness-challenge-box"),
  livenessInstruction: document.getElementById("liveness-instruction"),
  challengeProgressFill: document.getElementById("challenge-progress-fill"),
  btnActionCheckin: document.getElementById("btn-action-checkin"),
  btnActionCheckout: document.getElementById("btn-action-checkout"),
  
  // Journal Form
  journalText: document.getElementById("journal-text"),
  journalCharCount: document.getElementById("journal-char-count"),
  journalSavedStatus: document.getElementById("journal-saved-status"),
  journalForm: document.getElementById("journal-form"),
  
  // Geofencing GPS display & mock triggers
  gpsCoordsDisplay: document.getElementById("gps-coords-display"),
  gpsDistanceDisplay: document.getElementById("gps-distance-display"),
  gpsAccuracyDisplay: document.getElementById("gps-accuracy-display"),
  personalHistoryList: document.getElementById("personal-history-list"),

  // Journal Checkout Modal
  modalJournalCheckout: document.getElementById("modal-journal-checkout"),
  formJournalCheckout: document.getElementById("form-journal-checkout"),
  journalCheckoutText: document.getElementById("journal-checkout-text"),
  journalCheckoutCharCount: document.getElementById("journal-checkout-char-count"),
  btnCancelJournalCheckout: document.getElementById("btn-cancel-journal-checkout"),
  btnSubmitJournalCheckout: document.getElementById("btn-submit-journal-checkout"),


  // Admin View Components
  kpiTotalEmployees: document.getElementById("kpi-total-employees"),
  kpiPresentCount: document.getElementById("kpi-present-count"),
  kpiPresentRate: document.getElementById("kpi-present-rate"),
  kpiLateCount: document.getElementById("kpi-late-count"),
  kpiLateRate: document.getElementById("kpi-late-rate"),
  kpiOutRadiusCount: document.getElementById("kpi-out-radius-count"),
  kpiOutRadiusRate: document.getElementById("kpi-out-radius-rate"),
  btnAdminRefresh: document.getElementById("btn-admin-refresh"),
  btnAdminExport: document.getElementById("btn-admin-export"),
  adminTableSearch: document.getElementById("admin-table-search"),
  adminTableFilterDate: document.getElementById("admin-table-filter-date"),
  dateRangeInputs: document.getElementById("date-range-inputs"),
  filterDateStart: document.getElementById("filter-date-start"),
  filterDateEnd: document.getElementById("filter-date-end"),
  adminTableFilterStatus: document.getElementById("admin-table-filter-status"),
  adminAttendanceTableBody: document.getElementById("admin-attendance-table-body"),
  adminEmployeeTableBody: document.getElementById("admin-employee-table-body"),
  btnAddEmployeeModal: document.getElementById("btn-add-employee-modal"),
  
  // Modals & Toasts
  modalJournalViewer: document.getElementById("modal-journal-viewer"),
  btnCloseJournalModal: document.getElementById("btn-close-journal-modal"),
  modalJournalAvatar: document.getElementById("modal-journal-avatar"),
  modalJournalEmployeeName: document.getElementById("modal-journal-employee-name"),
  modalJournalDateRole: document.getElementById("modal-journal-date-role"),
  modalJournalTextContent: document.getElementById("modal-journal-text-content"),
  btnDismissJournalModal: document.getElementById("btn-dismiss-journal-modal"),
  btnVerifyJournal: document.getElementById("btn-verify-journal"),
  
  modalPhotoViewer: document.getElementById("modal-photo-viewer"),
  btnClosePhotoModal: document.getElementById("btn-close-photo-modal"),
  modalAttendancePhoto: document.getElementById("modal-attendance-photo"),
  modalPhotoEmployeeName: document.getElementById("modal-photo-employee-name"),
  modalPhotoTimestamp: document.getElementById("modal-photo-timestamp"),
  modalPhotoMatchRate: document.getElementById("modal-photo-match-rate"),
  btnDismissPhotoModal: document.getElementById("btn-dismiss-photo-modal"),
  
  notificationToast: document.getElementById("notification-toast"),
  toastTitle: document.getElementById("toast-title"),
  toastDesc: document.getElementById("toast-desc"),
  btnCloseToast: document.getElementById("btn-close-toast"),
  
  // Add Employee Modal
  modalAddEmployee: document.getElementById("modal-add-employee"),
  btnCloseAddEmployeeModal: document.getElementById("btn-close-add-employee-modal"),
  formAddEmployee: document.getElementById("form-add-employee"),
  addEmpName: document.getElementById("add-emp-name"),
  addEmpEmail: document.getElementById("add-emp-email"),
  addEmpPassword: document.getElementById("add-emp-password"),
  addEmpAccountRole: document.getElementById("add-emp-account-role"),
  addEmpRole: document.getElementById("add-emp-role"),
  addEmpWebcam: document.getElementById("add-emp-webcam"),
  addEmpCanvas: document.getElementById("add-emp-canvas"),
  addEmpPhotoPreview: document.getElementById("add-emp-photo-preview"),
  btnAddEmpCamera: document.getElementById("btn-add-emp-camera"),
  btnAddEmpCapture: document.getElementById("btn-add-emp-capture"),
  addEmpPhotoData: document.getElementById("add-emp-photo-data"),
  
  // Rekapitulasi Jabatan
  adminRekapJabatanBody: document.getElementById("admin-rekap-jabatan-body"),
  
  // Rekap Bulanan
  rekapBulan: document.getElementById("rekap-bulan"),
  rekapTahun: document.getElementById("rekap-tahun"),
  thTanggalColspan: document.getElementById("th-tanggal-colspan"),
  trTanggalHeaders: document.getElementById("tr-tanggal-headers"),
  tbodyRekapBulanan: document.getElementById("tbody-rekap-bulanan"),
  btnCetakRekapBulanan: document.getElementById("btn-cetak-rekap-bulanan"),
  
  // Calendar Management
  adminCalendarTableBody: document.getElementById("admin-calendar-table-body"),
  btnAddCalendarModal: document.getElementById("btn-add-calendar-modal"),
  modalAddCalendar: document.getElementById("modal-add-calendar"),
  btnCloseCalendarModal: document.getElementById("btn-close-calendar-modal"),
  formAddCalendar: document.getElementById("form-add-calendar"),
  addCalDate: document.getElementById("add-cal-date"),
  addCalTitle: document.getElementById("add-cal-title"),
  addCalType: document.getElementById("add-cal-type"),
  
  // Admin Office GPS 
  adminOfficeLat: document.getElementById("admin-office-lat"),
  adminOfficeLng: document.getElementById("admin-office-lng"),
  btnUpdateOfficeGps: document.getElementById("btn-update-office-gps"),
  
  // Admin Shift Settings
  adminShiftSiangIn: document.getElementById("admin-shift-siang-in"),
  adminShiftSiangOut: document.getElementById("admin-shift-siang-out"),
  adminShiftMalamIn: document.getElementById("admin-shift-malam-in"),
  adminShiftMalamOut: document.getElementById("admin-shift-malam-out"),
  btnSaveShiftConfig: document.getElementById("btn-save-shift-config"),
  
  // Add Employee Shift
  addEmpShift: document.getElementById("add-emp-shift"),
  
  btnExportJournalPdf: document.getElementById("btn-export-journal-pdf"),
  
  // Verification Portal
  viewVerifikasi: document.getElementById("view-verifikasi"),
  btnBackToLogin: document.getElementById("btn-back-to-login"),
  verificationDetailContainer: document.getElementById("verification-detail-container")
};

// --- 4. SYSTEM INITIALIZATION & HELPER CLOCK ---
let faceApiLoaded = false;
async function loadFaceAPI() {
  try {
    if (!window.faceapi) return;
    const modelPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model/';
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
    faceApiLoaded = true;
    console.log("Face API Models Loaded!");
  } catch (e) {
    console.error("Face API Error:", e);
  }
}

async function initApp() {
  loadFaceAPI();
  startDigitalClock();
  setupEventListeners();
  
  // Load data from Neon DB
  await db.syncFromBackend();
  
  // Populate dropdowns once data is loaded
  populateRekapJurnalKaryawanDropdown();
  
  // Auto-routing for QR Code Verification Link
  const urlParams = new URLSearchParams(window.location.search);
  const verifyId = urlParams.get('verify');
  if (verifyId) {
    window.showVerificationPortal(verifyId);
  }
}

function startDigitalClock() {
  setInterval(() => {
    const now = new Date();
    let hours = now.getHours().toString().padStart(2, '0');
    let minutes = now.getMinutes().toString().padStart(2, '0');
    let seconds = now.getSeconds().toString().padStart(2, '0');
    DOM.clockTime.textContent = `${hours}:${minutes}:${seconds} WIB`;
  }, 1000);
}

// Haversine distance formula (in meters)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Synthesized futuristic audio sounds (Cyber chimes)
function playSynthesizedSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'success') {
      // High-tech check-in double beep chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc2.frequency.setValueAtTime(1320, ctx.currentTime); // E6
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc1.start();
      osc2.start();
      
      setTimeout(() => {
        osc1.frequency.setValueAtTime(1760, ctx.currentTime); // A6
        osc2.frequency.setValueAtTime(2640, ctx.currentTime); // E7
      }, 100);
      
      osc1.stop(ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.5);
    } else if (type === 'verify') {
      // Shorter scan verified single sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'error') {
      // Cyber failure sound (low descending tone)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.warn("Audio Context blocked or not supported on this browser.");
  }
}

// --- 5. TOAST NOTIFICATIONS HELPER ---
function showToast(title, desc, type = 'success') {
  DOM.toastTitle.textContent = title;
  DOM.toastDesc.textContent = desc;
  
  DOM.notificationToast.classList.remove('success', 'error', 'warning', 'info', 'hidden');
  DOM.notificationToast.classList.add(type);
  
  // Play sound match
  if (type === 'success') playSynthesizedSound('success');
  if (type === 'error') playSynthesizedSound('error');
  if (type === 'info') playSynthesizedSound('verify');
  
  // Close existing timeout if any
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  
  window.toastTimeout = setTimeout(() => {
    DOM.notificationToast.classList.add('hidden');
  }, 4500);
}

DOM.btnCloseToast.addEventListener('click', () => {
  DOM.notificationToast.classList.add('hidden');
});

// --- 6. GEOLOCATION & RADAR ENGINE ---
// ---- FAKE GPS DETECTION ENGINE ----
function analyzeFakeGPS(readings) {
  // readings: [{lat, lng, ts, accuracy}, ...]
  const results = { isFake: false, reason: '', confidence: 0 };

  // Rule 1: Suspiciously perfect accuracy (fake GPS apps often lock to exactly 0-2m on non-GPS hardware)
  const avgAccuracy = readings.reduce((s, r) => s + r.accuracy, 0) / readings.length;
  if (avgAccuracy < 3 && readings.length > 1) {
    results.isFake = true;
    results.reason = `Akurasi GPS mencurigakan (${avgAccuracy.toFixed(1)}m) – tidak wajar untuk perangkat tanpa modul GPS fisik.`;
    results.confidence = 85;
    return results;
  }

  // Rule 2: Zero movement while accuracy changes (real GPS drifts slightly; fake GPS is perfectly static)
  if (readings.length >= 3) {
    const lats = readings.map(r => r.lat);
    const lngs = readings.map(r => r.lng);
    const latDiff = Math.max(...lats) - Math.min(...lats);
    const lngDiff = Math.max(...lngs) - Math.min(...lngs);
    const accDiff = Math.max(...readings.map(r => r.accuracy)) - Math.min(...readings.map(r => r.accuracy));
    // Perfectly frozen coordinates with non-zero accuracy variance = fake
    if (latDiff === 0 && lngDiff === 0 && accDiff > 5) {
      results.isFake = true;
      results.reason = 'Koordinat sama persis di semua pembacaan sementara akurasi berubah – indikasi GPS virtual.';
      results.confidence = 90;
      return results;
    }
  }

  // Rule 3: Speed anomaly between consecutive readings (>250 km/h = physically impossible)
  for (let i = 1; i < readings.length; i++) {
    const r1 = readings[i - 1], r2 = readings[i];
    const distM = calculateHaversineDistance(r1.lat, r1.lng, r2.lat, r2.lng);
    const dtSec = (r2.ts - r1.ts) / 1000;
    if (dtSec > 0) {
      const speedKmh = (distM / dtSec) * 3.6;
      if (speedKmh > 250) {
        results.isFake = true;
        results.reason = `Kecepatan perpindahan GPS tidak wajar (${speedKmh.toFixed(0)} km/jam) – kemungkinan penggunaan Fake GPS.`;
        results.confidence = 95;
        return results;
      }
    }
  }

  // Rule 4: Sudden huge jump from last known real position (>50 km in <60 s)
  if (state.gpsLastReading && readings.length > 0) {
    const latest = readings[readings.length - 1];
    const jumpM = calculateHaversineDistance(state.gpsLastReading.lat, state.gpsLastReading.lng, latest.lat, latest.lng);
    const dtSec = (latest.ts - state.gpsLastReading.ts) / 1000;
    if (jumpM > 50000 && dtSec < 60) {
      results.isFake = true;
      results.reason = `Loncatan posisi ${(jumpM/1000).toFixed(1)} km dalam ${dtSec.toFixed(0)} detik – tidak mungkin terjadi secara fisik.`;
      results.confidence = 98;
      return results;
    }
  }

  return results; // all clear
}

function markFakeGPSUI(reason) {
  state.fakeGpsDetected = true;
  state.fakeGpsReason = reason;

  DOM.gpsCoordsDisplay.innerHTML = `<span style="color: var(--error);"><i class="fa-solid fa-triangle-exclamation"></i> Fake GPS Terdeteksi</span>`;
  DOM.gpsDistanceDisplay.textContent = 'Tidak Valid';
  DOM.gpsAccuracyDisplay.textContent = '-';
  DOM.widgetGpsDistance.textContent = '!';
  DOM.widgetGpsDistance.style.color = 'var(--error)';
  DOM.widgetGpsStatus.textContent = 'GPS Palsu Terdeteksi!';
  DOM.widgetGpsStatus.className = 'widget-badge error';

  showToast('🚨 Fake GPS Terdeteksi', reason, 'error');
  updateLaporButtonsState();
}

window.triggerGPSFetch = function() {
  if (!navigator.geolocation) {
    showToast("GPS Tidak Didukung", "Browser atau koneksi Anda (HTTP) tidak mengizinkan akses lokasi. Gunakan HTTPS.", "error");
    DOM.gpsCoordsDisplay.textContent = "Error: Gunakan HTTPS";
    DOM.widgetGpsStatus.textContent = "GPS Tidak Didukung";
    DOM.widgetGpsStatus.className = "widget-badge error";
    return;
  }

  // Reset detection state
  state.fakeGpsDetected = false;
  state.fakeGpsReason = '';
  state.gpsReadings = [];

  DOM.gpsCoordsDisplay.textContent = "Memverifikasi keaslian GPS... (Ambil 3 sampel)";
  DOM.widgetGpsStatus.textContent = "Memverifikasi GPS...";
  DOM.widgetGpsStatus.className = "widget-badge info";

  const SAMPLE_COUNT = 3;
  const INTERVAL_MS = 1500;
  const optionsHigh = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };
  const optionsLow  = { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 };

  let samplesCollected = 0;

  function collectSample() {
    const opts = samplesCollected === 0 ? optionsHigh : { ...optionsHigh, timeout: 6000 };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const sample = {
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          ts:       Date.now()
        };
        state.gpsReadings.push(sample);
        samplesCollected++;

        DOM.gpsCoordsDisplay.textContent = `Sampel ${samplesCollected}/${SAMPLE_COUNT} – Menganalisa...`;

        if (samplesCollected < SAMPLE_COUNT) {
          setTimeout(collectSample, INTERVAL_MS);
        } else {
          // All samples collected — run analysis
          const analysis = analyzeFakeGPS(state.gpsReadings);
          if (analysis.isFake) {
            markFakeGPSUI(analysis.reason);
          } else {
            // Legitimate GPS — use last sample
            const best = state.gpsReadings[state.gpsReadings.length - 1];
            state.gpsLastReading = { lat: best.lat, lng: best.lng, ts: best.ts };
            updateGeofenceCalculation(best.lat, best.lng, best.accuracy);
            showToast("GPS Terverifikasi", `Lokasi asli terkonfirmasi. Akurasi ±${best.accuracy}m.`, "success");
          }
        }
      },
      (err) => {
        if (samplesCollected === 0) {
          // First sample failed — try low accuracy fallback
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const sample = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy), ts: Date.now() };
              state.gpsLastReading = sample;
              updateGeofenceCalculation(sample.lat, sample.lng, sample.accuracy);
              showToast("GPS (Akurasi Rendah)", `Lokasi dimuat via jaringan. Akurasi ±${sample.accuracy}m.`, "info");
            },
            (err2) => {
              let errMsg = "Gagal memuat GPS.";
              if (err2.code === 1) errMsg = "Izin lokasi ditolak browser.";
              else if (err2.code === 2) errMsg = "Sinyal GPS tidak tersedia.";
              else if (err2.code === 3) errMsg = "Pencarian GPS habis waktu.";
              DOM.gpsCoordsDisplay.innerHTML = `${errMsg} <a href="#" onclick="window.triggerGPSFetch(); return false;" style="color: #06b6d4; text-decoration: underline; margin-left: 8px; font-weight: bold;">Coba Lagi</a>`;
              DOM.widgetGpsStatus.textContent = "GPS Gagal";
              DOM.widgetGpsStatus.className = "widget-badge error";
              DOM.widgetGpsDistance.textContent = "-";
              showToast("GPS Gagal", errMsg, "error");
            },
            optionsLow
          );
        } else {
          // Partial samples — use what we have
          const analysis = analyzeFakeGPS(state.gpsReadings);
          if (analysis.isFake) {
            markFakeGPSUI(analysis.reason);
          } else {
            const best = state.gpsReadings[state.gpsReadings.length - 1];
            state.gpsLastReading = { lat: best.lat, lng: best.lng, ts: best.ts };
            updateGeofenceCalculation(best.lat, best.lng, best.accuracy);
            showToast("GPS Terkunci", `Lokasi diverifikasi dengan ${samplesCollected} sampel.`, "success");
          }
        }
      },
      opts
    );
  }

  collectSample();
}
function updateGeofenceCalculation(lat, lng, accuracy = 8) {
  state.currentLat = lat;
  state.currentLng = lng;
  state.currentAccuracy = accuracy;
  
  state.gpsDistance = calculateHaversineDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);
  
  // UI Render text
  DOM.gpsCoordsDisplay.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  DOM.gpsDistanceDisplay.textContent = `${state.gpsDistance} meter`;
  DOM.gpsAccuracyDisplay.textContent = `± ${accuracy} meter`;
  DOM.widgetGpsDistance.textContent = `${state.gpsDistance} m`;
  
  // Radius status
  if (state.gpsDistance <= OFFICE_RADIUS) {
    state.gpsStatus = "in-radius";
    DOM.widgetGpsStatus.textContent = "Dalam Radius Kantor";
    DOM.widgetGpsStatus.className = "widget-badge success";
    DOM.widgetGpsDistance.style.color = "var(--success)";
  } else {
    state.gpsStatus = "out-radius";
    DOM.widgetGpsStatus.textContent = "Luar Radius Kantor";
    DOM.widgetGpsStatus.className = "widget-badge error";
    DOM.widgetGpsDistance.style.color = "var(--error)";
  }
  
  // Update leafet map marker
  if (state.leafletMaps.employee && state.leafletMaps.employeeUserMarker) {
    const latlng = [lat, lng];
    state.leafletMaps.employeeUserMarker.setLatLng(latlng);
    state.leafletMaps.employee.panTo(latlng);
  }
  
  updateLaporButtonsState();
}

function updateLaporButtonsState() {
  const checkinTime = db.getTodayAttendance(state.currentUser?.id)?.check_in_time;
  const checkoutTime = db.getTodayAttendance(state.currentUser?.id)?.check_out_time;

  // Datang button active when: logged-in, camera biometric completed, today not checked-in, AND gpsDistance ready
  if (state.currentUser && state.biometricVerified && !checkinTime && state.gpsDistance !== null) {
    DOM.btnActionCheckin.disabled = false;
  } else {
    DOM.btnActionCheckin.disabled = true;
  }
  
  // Pulang button active when: logged-in, camera biometric completed, today checked-in but not checked-out, AND gps ready
  if (state.currentUser && state.biometricVerified && checkinTime && !checkoutTime && state.gpsDistance !== null) {
    DOM.btnActionCheckout.disabled = false;
  } else {
    DOM.btnActionCheckout.disabled = true;
  }
}

// Render leaflet maps
function initLeafletMaps() {
  const centerCoords = [OFFICE_LAT, OFFICE_LNG];
  
  // 1. Employee map
  if (!state.leafletMaps.employee) {
    state.leafletMaps.employee = L.map('employee-mini-map', {
      zoomControl: false,
      attributionControl: false
    }).setView(centerCoords, 16);
    
    // Use CartoDB dark tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(state.leafletMaps.employee);
    
    // Add Office Circle Radius
    L.circle(centerCoords, {
      color: 'var(--primary)',
      fillColor: 'rgba(6, 182, 212, 0.1)',
      fillOpacity: 0.2,
      radius: OFFICE_RADIUS
    }).addTo(state.leafletMaps.employee);
    
    // Add office landmark marker
    const officeIcon = L.divIcon({
      className: 'office-custom-marker',
      html: '<div style="background: var(--accent); width:14px; height:14px; border-radius:50%; border:2px solid #fff; box-shadow: 0 0 10px var(--accent-glow)"></div>',
      iconSize: [14, 14]
    });
    L.marker(centerCoords, { icon: officeIcon }).addTo(state.leafletMaps.employee)
      .bindPopup("Kantor Disdukcapil").openPopup();
      
    // Add active employee marker
    const userIcon = L.divIcon({
      className: 'user-custom-marker',
      html: '<div style="background: var(--primary); width:18px; height:18px; border-radius:50%; border:3px solid #fff; box-shadow: 0 0 12px var(--primary-glow); animation: heartbeat 2s infinite"></div>',
      iconSize: [18, 18]
    });
    
    const initialLat = state.currentLat !== null ? state.currentLat : OFFICE_LAT;
    const initialLng = state.currentLng !== null ? state.currentLng : OFFICE_LNG;
    
    state.leafletMaps.employeeUserMarker = L.marker([initialLat, initialLng], {
      icon: userIcon
    }).addTo(state.leafletMaps.employee);
  }
  
  // 2. Admin map
  if (!state.leafletMaps.admin && DOM.viewAdmin.classList.contains('active')) {
    setTimeout(() => {
      // Invalidate size to load correctly when panel becomes visible
      state.leafletMaps.admin = L.map('admin-attendance-map', {
        zoomControl: true,
        attributionControl: false
      }).setView(centerCoords, 14);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(state.leafletMaps.admin);
      
      // Office radius circle
      L.circle(centerCoords, {
        color: 'var(--accent)',
        fillColor: 'rgba(99, 102, 241, 0.05)',
        fillOpacity: 0.15,
        radius: OFFICE_RADIUS
      }).addTo(state.leafletMaps.admin);
      
      // Office center marker
      const officeIconAdmin = L.divIcon({
        className: 'office-custom-marker-admin',
        html: '<div style="background: var(--accent); width:16px; height:16px; border-radius:50%; border:3px solid #fff; box-shadow: 0 0 15px var(--accent-glow)"></div>',
        iconSize: [16, 16]
      });
      L.marker(centerCoords, { icon: officeIconAdmin }).addTo(state.leafletMaps.admin)
        .bindPopup("<strong>Kantor Disdukcapil</strong><br>Pusat Geofencing Radius 150m");

      // Add map click listener to update input fields
      let adminTargetMarker = null;
      state.leafletMaps.admin.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (DOM.adminOfficeLat && DOM.adminOfficeLng) {
          DOM.adminOfficeLat.value = lat.toFixed(6);
          DOM.adminOfficeLng.value = lng.toFixed(6);
        }
        if (adminTargetMarker) {
          adminTargetMarker.setLatLng(e.latlng);
        } else {
          adminTargetMarker = L.marker(e.latlng, {
            icon: L.divIcon({
              className: 'office-temp-marker',
              html: '<div style="background: var(--warning); width:14px; height:14px; border-radius:50%; border:2px solid #fff; box-shadow: 0 0 8px var(--warning-glow)"></div>',
              iconSize: [14, 14]
            })
          }).addTo(state.leafletMaps.admin).bindPopup("Titik baru (klik tombol Perbarui untuk menyimpan)").openPopup();
        }
      });

      plotAdminMapRecords();
    }, 150);
  }
}

// Plot active today's check-ins on admin map
function plotAdminMapRecords() {
  if (!state.leafletMaps.admin) return;
  
  // Clear old markers
  state.leafletMaps.adminMarkers.forEach(m => state.leafletMaps.admin.removeLayer(m));
  state.leafletMaps.adminMarkers = [];
  
  const filteredLogs = getFilteredAdminLogs();
  
  filteredLogs.forEach(log => {
    const user = db.users.find(u => u.id === log.user_id);
    if (!user) return;
    
    const [latStr, lngStr] = log.latitude_longitude.split(',');
    const lat = parseFloat(latStr.trim());
    const lng = parseFloat(lngStr.trim());
    
    let markerColor = 'var(--success)';
    if (log.status === 'Terlambat') markerColor = 'var(--warning)';
    if (log.status === 'Luar Radius') markerColor = 'var(--error)';
    
    const pulseAnim = log.status === 'Luar Radius' ? 'animation: heartbeat 1.5s infinite;' : '';
    
    const attendeeIcon = L.divIcon({
      className: 'attendee-marker',
      html: `<div style="background: ${markerColor}; width:16px; height:16px; border-radius:50%; border:3px solid #fff; box-shadow: 0 0 10px ${markerColor}; ${pulseAnim}"></div>`,
      iconSize: [16, 16]
    });
    
    const popupHtml = `
      <div style="font-family: var(--font-body); width: 180px; padding: 4px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <img src="${user.photo}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;" />
          <div>
            <h5 style="margin:0; font-size:0.78rem; font-weight:700;">${user.name}</h5>
            <span style="font-size:0.6rem; color:var(--text-secondary);">${user.position}</span>
          </div>
        </div>
        <p style="margin:0 0 4px 0; font-size:0.68rem;"><strong>Datang:</strong> ${new Date(log.check_in_time).toLocaleTimeString('id-ID')} WIB</p>
        <p style="margin:0 0 4px 0; font-size:0.68rem;"><strong>Jarak:</strong> ${log.distance}m (${log.status})</p>
        <p style="margin:0; font-size:0.68rem;"><strong>Verifikasi:</strong> ${log.face_match}% Cocok</p>
      </div>
    `;
    
    const m = L.marker([lat, lng], { icon: attendeeIcon })
      .addTo(state.leafletMaps.admin)
      .bindPopup(popupHtml);
      
    state.leafletMaps.adminMarkers.push(m);
  });
}

// --- 7. WEBCAM INTERACTIVES & BIOMETRICS AI EMULATION ---
function activateWebcam() {
  if (state.webcamActive) return;
  
  DOM.cameraFallback.classList.add('hidden');
  DOM.webcamStream.classList.remove('hidden');
  DOM.scanningLaser.classList.remove('hidden');
  DOM.livenessChallengeBox.classList.remove('hidden');
  
  state.webcamActive = true;
  state.biometricVerified = false;
  state.livenessChallengeProgress = 0;
  
  // Request actual camera stream
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
    .then(stream => {
      state.stream = stream;
      DOM.webcamStream.srcObject = stream;
      startBiometricOverlaySimulation();
    })
    .catch(err => {
      console.warn("Kamera fisik diblokir atau tidak tersedia, menjalankan fallback visual simulator.");
      // Render animated simulation directly on canvas
      startBiometricOverlaySimulation(true);
    });
}

function stopWebcam() {
  if (!state.webcamActive) return;
  
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }
  
  DOM.webcamStream.srcObject = null;
  DOM.webcamStream.classList.add('hidden');
  DOM.scanningLaser.classList.add('hidden');
  DOM.livenessChallengeBox.classList.add('hidden');
  DOM.cameraFallback.classList.remove('hidden');
  
  state.webcamActive = false;
  
  const ctx = DOM.biometricCanvas.getContext('2d');
  ctx.clearRect(0, 0, DOM.biometricCanvas.width, DOM.biometricCanvas.height);
  
  if (window.biometricAnimFrame) cancelAnimationFrame(window.biometricAnimFrame);
  if (window.challengeInterval) clearInterval(window.challengeInterval);
}

// Dynamic liveness prompts
const LIVENESS_CHALLENGES = [
  "Silakan Berkedip (Blink your eyes)",
  "Tengok Kiri, lalu Kanan (Turn Left, then Right)",
  "Silakan Senyum Lebar (Smile widely)",
  "Anggukkan Kepala (Nod your head)"
];

function startBiometricOverlaySimulation(isMockCamera = false) {
  const canvas = DOM.biometricCanvas;
  const ctx = canvas.getContext('2d');
  
  // Sync canvas dimensions
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  
  // Pick random challenge
  state.currentLivenessPrompt = LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)];
  DOM.livenessInstruction.textContent = state.currentLivenessPrompt;
  DOM.challengeProgressFill.style.width = "0%";
  
  // Audio chime start scan
  playSynthesizedSound('verify');
  
  let frame = 0;
  
  // Facial feature offsets that shift smoothly to mimic movement
  let eyeWink = 0;
  let jawDrop = 0;
  let faceShiftX = 0;
  let faceShiftY = 0;
  
  function drawFrame() {
    if (!state.webcamActive) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    
    // Add sinusoidal sway for realistic tracking mockup
    faceShiftX = Math.sin(frame / 30) * 12;
    faceShiftY = Math.cos(frame / 45) * 8;
    
    if (isMockCamera) {
      // Draw premium dark silhouette when webcams are blocked or missing
      ctx.fillStyle = "#1e1e24";
      ctx.beginPath();
      // Head shape
      ctx.ellipse(center.x + faceShiftX, center.y + faceShiftY - 10, 80, 110, 0, 0, Math.PI * 2);
      ctx.fill();
      // Shoulders
      ctx.beginPath();
      ctx.ellipse(center.x + faceShiftX, center.y + faceShiftY + 160, 140, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Cyber nodes on mock head
      ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
      ctx.beginPath();
      ctx.arc(center.x + faceShiftX, center.y + faceShiftY - 10, 4, 0, Math.PI*2);
      ctx.fill();
    }
    
    // A. DRAW futuristic facial biometric hud rings
    ctx.strokeStyle = "rgba(6, 182, 212, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 15]);
    ctx.beginPath();
    ctx.arc(center.x + faceShiftX, center.y + faceShiftY - 10, 125, 0, Math.PI * 2);
    ctx.stroke();
    
    // Cyber reticle brackets
    ctx.strokeStyle = "var(--primary)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    
    const bracketSize = 25;
    const r = 135;
    const cx = center.x + faceShiftX;
    const cy = center.y + faceShiftY - 10;
    
    // Top-Left corner bracket
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r + bracketSize);
    ctx.lineTo(cx - r, cy - r);
    ctx.lineTo(cx - r + bracketSize, cy - r);
    ctx.stroke();
    
    // Top-Right bracket
    ctx.beginPath();
    ctx.moveTo(cx + r, cy - r + bracketSize);
    ctx.lineTo(cx + r, cy - r);
    ctx.lineTo(cx + r - bracketSize, cy - r);
    ctx.stroke();
    
    // Bottom-Left bracket
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r - bracketSize);
    ctx.lineTo(cx - r, cy + r);
    ctx.lineTo(cx - r + bracketSize, cy + r);
    ctx.stroke();
    
    // Bottom-Right bracket
    ctx.beginPath();
    ctx.moveTo(cx + r, cy + r - bracketSize);
    ctx.lineTo(cx + r, cy + r);
    ctx.lineTo(cx + r - bracketSize, cy + r);
    ctx.stroke();
    
    // B. DRAW facial keypoints matrix (Face mesh coordinates)
    const points = [
      // Forehead
      {x: 0, y: -90}, {x: -30, y: -80}, {x: 30, y: -80},
      // Brows
      {x: -45, y: -50}, {x: -20, y: -52}, {x: 20, y: -52}, {x: 45, y: -50},
      // Nose bridge
      {x: 0, y: -45}, {x: 0, y: -20}, {x: 0, y: 5}, {x: -12, y: 15}, {x: 12, y: 15},
      // Eyes
      {x: -40, y: -30}, {x: -25, y: -30}, {x: 25, y: -30}, {x: 40, y: -30},
      // Cheeks
      {x: -65, y: 0}, {x: 65, y: 0}, {x: -55, y: 40}, {x: 55, y: 40},
      // Mouth
      {x: -30, y: 55}, {x: 30, y: 55}, {x: 0, y: 48}, {x: 0, y: 64},
      // Jawline
      {x: 0, y: 100}, {x: -40, y: 90}, {x: 40, y: 90}, {x: -65, y: 65}, {x: 65, y: 65}
    ];
    
    // Draw wireframe connection lines between some points to look like real AI mapping
    ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
    ctx.lineWidth = 0.5;
    
    // Draw jaw-contour
    ctx.beginPath();
    ctx.moveTo(cx - 65, cy + 65);
    ctx.lineTo(cx - 40, cy + 90);
    ctx.lineTo(cx, cy + 100 + jawDrop);
    ctx.lineTo(cx + 40, cy + 90);
    ctx.lineTo(cx + 65, cy + 65);
    ctx.stroke();
    
    // Draw nose-to-brow
    ctx.beginPath();
    ctx.moveTo(cx, cy - 45);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 12, cy + 15);
    ctx.lineTo(cx + 12, cy + 15);
    ctx.closePath();
    ctx.stroke();
    
    // Draw dots
    points.forEach((p, idx) => {
      let py = p.y;
      
      // Simulate movements depending on liveness challenges
      if (state.currentLivenessPrompt.includes("Senyum") && (idx >= 20 && idx <= 23)) {
        // Expand mouth width
        p.x *= 1.15;
      }
      
      if (state.currentLivenessPrompt.includes("Berkedip") && (idx >= 12 && idx <= 15)) {
        // Blink eyes rhythmically
        eyeWink = Math.abs(Math.sin(frame / 6));
        if (eyeWink > 0.7) py = -30 + 5; 
      }
      
      if (state.currentLivenessPrompt.includes("Anggukkan") && idx > 23) {
        py += Math.sin(frame / 8) * 8;
      }
      
      const dotX = cx + p.x;
      const dotY = cy + py;
      
      ctx.fillStyle = idx % 3 === 0 ? "var(--primary)" : "var(--accent)";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Floating numeric vector indexes
      if (idx % 7 === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.font = "6px monospace";
        ctx.fillText(`v_${idx}`, dotX + 5, dotY + 2);
      }
    });
    
    // C. Draw glowing safe mesh grid matching verified state
    if (state.biometricVerified) {
      ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
      ctx.beginPath();
      ctx.ellipse(cx, cy, 120, 120, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = "var(--success)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      
      ctx.fillStyle = "var(--success)";
      ctx.font = "bold 10px var(--font-display)";
      ctx.textAlign = "center";
      ctx.fillText("BIOMETRIC VALIDATED (100%)", cx, cy - 145);
    }
    
    window.biometricAnimFrame = requestAnimationFrame(drawFrame);
  }
  
  // Start liveness challenge ticking progression
  window.biometricAnimFrame = requestAnimationFrame(drawFrame);
  
  window.challengeInterval = setInterval(() => {
    if (state.livenessChallengeProgress < 100) {
      state.livenessChallengeProgress += 10;
      DOM.challengeProgressFill.style.width = `${state.livenessChallengeProgress}%`;
      
      // Micro verified sound
      if (state.livenessChallengeProgress % 30 === 0) {
        playSynthesizedSound('verify');
      }
    } else {
      clearInterval(window.challengeInterval);
      state.biometricVerified = true;
      DOM.scanningLaser.classList.add('hidden');
      DOM.livenessChallengeBox.classList.add('hidden');
      
      // Synthesis success beep
      playSynthesizedSound('success');
      showToast("Biometrik Terverifikasi", "Wajah asli terdeteksi dan lolos uji liveness.", "info");
      
      updateLaporButtonsState();
    }
  }, 350);
}

// Take picture screenshot from video or render custom avatar canvas picture
function captureSelfie() {
  const video = DOM.webcamStream;
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  
  if (state.stream && !video.paused) {
    // Capture real webcam snapshot frame
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1); // mirror
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
  } else {
    // Fallback: draw high quality vector face icon with current timestamp text
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Gradient outline
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(1, '#06b6d4');
    
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Draw face silhouette
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 10, 48, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height / 2 + 75, 75, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw grid scanner
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 8px monospace';
    ctx.fillText("AI VERIFIED SECURE LOG", 20, 30);
    ctx.fillText(new Date().toLocaleString('id-ID'), 20, 220);
    
    return canvas.toDataURL('image/jpeg');
  }
}

// --- 8. ATTENDANCE SUBMISSION ENGINE ---

// Show mandatory journal modal before checkout
function showJournalCheckoutModal() {
  if (!DOM.modalJournalCheckout) return;
  // Pre-fill if there's already a journal for today
  const existing = db.getTodayJournal(state.currentUser.id);
  DOM.journalCheckoutText.value = existing ? existing.task_description : '';
  const len = DOM.journalCheckoutText.value.length;
  DOM.journalCheckoutCharCount.textContent = `${len} / 1000 Karakter`;
  DOM.journalCheckoutCharCount.style.color = len >= 20 ? 'var(--success)' : 'var(--text-tertiary)';
  DOM.modalJournalCheckout.classList.remove('hidden');
  setTimeout(() => DOM.journalCheckoutText.focus(), 100);
}

async function handleAttendanceCheck(type) {
  if (!state.currentUser) return;
  
  if (state.gpsDistance === null) {
    showToast("GPS Belum Siap", "Sistem masih memverifikasi GPS Anda. Tunggu hingga status GPS berubah hijau.", "error");
    return;
  }

  // Block if fake GPS detected
  if (state.fakeGpsDetected) {
    showToast("🚨 Akses Ditolak – Fake GPS", `Presensi dibatalkan. ${state.fakeGpsReason}`, "error");
    return;
  }

  // For check-out: show the mandatory journal modal first
  if (type === 'out') {
    showJournalCheckoutModal();
    return; // actual checkout will proceed from modal submit
  }

  // Normalize '_out_confirmed' (from journal modal) to 'out'
  const checkType = type === '_out_confirmed' ? 'out' : type;

  // Double validation: biometrics must be verified!
  if (!state.biometricVerified) {
    showToast("Verifikasi Gagal", "Lakukan pemindaian wajah biometrik terlebih dahulu.", "error");
    return;
  }
  
  // Geofencing limits
  const isInside = state.gpsDistance <= OFFICE_RADIUS;
  let statusStr = "Luar Radius";
  
  if (isInside) {
    statusStr = "Hadir";
    if (checkType === 'in') {
      const shift = state.currentUser.shift || 'siang';
      const config = SHIFT_CONFIG[shift];
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const [limitH, limitM] = config.in.split(':').map(Number);
      const limitMin = limitH * 60 + limitM;
      
      if (shift === 'siang') {
         if (currentMin > limitMin) statusStr = "Terlambat";
      } else {
         if (currentMin > limitMin || currentMin < 300) statusStr = "Terlambat";
      }
    } else if (checkType === 'out') {
      const shift = state.currentUser.shift || 'siang';
      const config = SHIFT_CONFIG[shift];
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const [limitH, limitM] = config.out.split(':').map(Number);
      const limitMin = limitH * 60 + limitM;
      
      if (shift === 'siang') {
         if (currentMin < limitMin) statusStr = "Pulang Lebih Awal";
      } else {
         if (currentMin < limitMin && currentMin > 300) statusStr = "Pulang Lebih Awal";
      }
    }
  }
  
  // Warning confirmation for Out-of-radius checkin
  if (!isInside) {
    const bypass = confirm(`PERINGATAN: Lokasi GPS Anda berjarak ${state.gpsDistance} meter dari Kantor Disdukcapil (Batas maksimum 150m).\n\nApakah Anda tetap ingin mengirimkan absen luar kantor ini? Log akan ditandai PELANGGARAN RADIUS oleh Pengawas.`);
    if (!bypass) return;
  }
  
  // Capture picture
  const photoBase64 = captureSelfie();
  
  // Real Biometric Face Verification
  let matchPercentStr = "0.0";
  if (faceApiLoaded && state.currentUser.faceDescriptor) {
      showToast("Memverifikasi", "Menganalisa struktur biometrik wajah...", "info");
      
      const img = new Image();
      img.src = photoBase64;
      await new Promise(r => img.onload = r);
      
      const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
      
      if (!detection) {
          showToast("Akses Ditolak", "Sistem tidak mendeteksi wajah di kamera. Silakan ulangi.", "error");
          return;
      }
      
      const refDescriptor = new Float32Array(state.currentUser.faceDescriptor);
      const distance = faceapi.euclideanDistance(detection.descriptor, refDescriptor);
      
      let matchPercent = (1 - distance) * 100;
      if (matchPercent > 100) matchPercent = 100;
      if (matchPercent < 0) matchPercent = 0;
      
      if (matchPercent < 55) {
          showToast("Wajah Tidak Dikenali", `Akses ditolak! Tingkat kecocokan hanya ${matchPercent.toFixed(1)}%. Wajah berbeda dengan data profil.`, "error");
          return;
      }
      matchPercentStr = matchPercent.toFixed(1);
  } else {
      // Mock if no descriptor stored
      matchPercentStr = (95 + Math.random() * 4.9).toFixed(1);
  }
  
  const coordsStr = `${state.currentLat.toFixed(6)}, ${state.currentLng.toFixed(6)}`;
  const faceMatch = matchPercentStr;
  
  // Save log
  const record = db.saveTodayAttendance(
    state.currentUser.id,
    checkType,
    photoBase64,
    coordsStr,
    state.gpsDistance,
    faceMatch,
    statusStr
  );
  
  playSynthesizedSound('success');
  
  // Update view widgets immediately
  renderEmployeeDashboardWidgets();
  renderPersonalHistoryTimeline();
  
  if (checkType === 'in') {
    showToast("Presensi Berhasil", `Lapor Datang tercatat pada ${new Date(record.check_in_time).toLocaleTimeString('id-ID')} WIB. Status: ${statusStr}`, isInside ? "success" : "warning");
  } else {
    showToast("Presensi Berhasil", `Lapor Pulang & Jurnal tercatat pada ${new Date(record.check_out_time).toLocaleTimeString('id-ID')} WIB. Sampai jumpa esok hari!`, "success");
  }
  
  // Turn off camera
  stopWebcam();
  
  // Sync admin if open
  if (DOM.viewAdmin.classList.contains('active')) {
    renderAdminDashboardKPIs();
    renderAdminRekapJabatan();
    renderAdminTable();
    plotAdminMapRecords();
    renderAdminCharts();
  }
}

// --- 9. PERSONAL DAILY JOURNAL ---
function handleJournalSubmit(e) {
  e.preventDefault();
  if (!state.currentUser) return;
  
  const textVal = DOM.journalText.value.trim();
  if (!textVal) return;
  
  db.saveTodayJournal(state.currentUser.id, textVal);
  
  DOM.journalSavedStatus.classList.remove('hidden');
  showToast("Jurnal Disimpan", "Laporan harian pekerjaan berhasil dikirim ke Pengawas.", "success");
  
  setTimeout(() => {
    DOM.journalSavedStatus.classList.add('hidden');
  }, 3000);
  
  renderPersonalHistoryTimeline();
  
  // Refresh admin tables if active
  if (DOM.viewAdmin.classList.contains('active')) {
    renderAdminTable();
  }
}

// --- 10. RENDER PERSONAL DASHBOARD & HISTORY ---
function renderEmployeeDashboardWidgets() {
  if (!state.currentUser) return;
  
  DOM.employeeWelcomeTitle.textContent = `Selamat ${getGreeting()}, ${state.currentUser.name}!`;
  
  const todayRecord = db.getTodayAttendance(state.currentUser.id);
  const todayJournal = db.getTodayJournal(state.currentUser.id);
  
  // Checkin Widget
  if (todayRecord && todayRecord.check_in_time) {
    const ciTime = new Date(todayRecord.check_in_time);
    DOM.widgetCheckInTime.textContent = ciTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB";
    DOM.widgetCheckInStatus.textContent = todayRecord.status;
    DOM.widgetCheckInStatus.className = `widget-badge ${todayRecord.status === 'Hadir' ? 'success' : (todayRecord.status === 'Terlambat' || todayRecord.status === 'Pulang Lebih Awal' ? 'warning' : 'error')}`;
  } else {
    DOM.widgetCheckInTime.textContent = "-- : --";
    DOM.widgetCheckInStatus.textContent = "Belum Presensi";
    DOM.widgetCheckInStatus.className = "widget-badge";
  }
  
  // Checkout Widget
  if (todayRecord && todayRecord.check_out_time) {
    const coTime = new Date(todayRecord.check_out_time);
    DOM.widgetCheckOutTime.textContent = coTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB";
    DOM.widgetCheckOutStatus.textContent = "Selesai Kerja";
    DOM.widgetCheckOutStatus.className = "widget-badge success";
  } else {
    DOM.widgetCheckOutTime.textContent = "-- : --";
    DOM.widgetCheckOutStatus.textContent = todayRecord && todayRecord.check_in_time ? "Aktif Kerja" : "Belum Presensi";
    DOM.widgetCheckOutStatus.className = todayRecord && todayRecord.check_in_time ? "widget-badge warning" : "widget-badge";
  }
  
  // Populate journal box if draft exists
  if (todayJournal) {
    DOM.journalText.value = todayJournal.task_description;
    DOM.journalCharCount.textContent = `${todayJournal.task_description.length} / 1000 Karakter`;
  } else {
    DOM.journalText.value = "";
    DOM.journalCharCount.textContent = "0 / 1000 Karakter";
  }
}

function getGreeting() {
  const hr = new Date().getHours();
  if (hr < 11) return "Pagi";
  if (hr < 15) return "Siang";
  if (hr < 18) return "Sore";
  return "Malam";
}

function renderPersonalHistoryTimeline() {
  if (!state.currentUser) return;
  
  const logs = db.getAttendanceLogs(state.currentUser.id);
  const container = DOM.personalHistoryList;
  container.innerHTML = "";
  
  if (logs.length === 0) {
    container.innerHTML = `
      <div class="timeline-empty">
        <i class="fa-regular fa-folder-open"></i>
        <p>Belum ada data riwayat absensi.</p>
      </div>
    `;
    return;
  }
  
  logs.forEach(log => {
    const journal = db.journals.find(j => j.user_id === log.user_id && j.date === log.date);
    
    let statusClass = log.status.replace(/\s+/g, "-");
    let isPermitStatus = log.status === 'Izin' || log.status === 'Sakit' || log.status === 'Cuti' || log.status === 'Mengantar Kepala Dinas';
    let checkinTimeStr = isPermitStatus ? "-" : new Date(log.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    let checkoutTimeStr = isPermitStatus ? "-" : (log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "Belum Absen");
    
    let statusLabel = log.status;
    let labelBadgeClass = log.status === 'Hadir' ? 'hadir' : 
                         (log.status === 'Terlambat' ? 'terlambat' : 
                         (log.status === 'Pulang Lebih Awal' ? 'terlambat' : 
                         (log.status === 'Izin' ? 'izin' : 
                         (log.status === 'Sakit' ? 'sakit' : 
                         (log.status === 'Cuti' ? 'cuti' : 
                         (log.status === 'Mengantar Kepala Dinas' ? 'dinas' : 'radius-warning'))))));
    
    const item = document.createElement("div");
    item.className = `history-item ${statusClass}`;
    
    // Journal block
    let journalBlock = '';
    if (journal) {
      if (journal.verified) {
        const verifiedTime = new Date(journal.verified_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
        journalBlock = `
          <div class="h-item-journal" style="border-left-color: var(--success); margin-top: 10px; background: rgba(34,197,94,0.06);">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
              <strong style="color: var(--success); font-size: 0.82rem;"><i class="fa-solid fa-circle-check"></i> Jurnal Telah Diverifikasi</strong>
              <span style="font-size: 0.75rem; background: rgba(34,197,94,0.15); color: var(--success); border: 1px solid rgba(34,197,94,0.3); border-radius: 20px; padding: 2px 10px;">
                <i class="fa-solid fa-user-shield"></i> ${journal.verified_by} &bull; ${verifiedTime}
              </span>
            </div>
            <div style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.6; white-space: pre-wrap; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 10px;">${journal.task_description}</div>
          </div>`;
      } else {
        journalBlock = `
          <div class="h-item-journal" style="border-left-color: var(--warning); margin-top: 10px; background: rgba(251,191,36,0.05);">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
              <strong style="color: var(--warning); font-size: 0.82rem;"><i class="fa-solid fa-clock"></i> Jurnal Menunggu Verifikasi</strong>
              <span style="font-size: 0.75rem; background: rgba(251,191,36,0.12); color: var(--warning); border: 1px solid rgba(251,191,36,0.3); border-radius: 20px; padding: 2px 10px;">Belum Diverifikasi</span>
            </div>
            <div style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.6; white-space: pre-wrap; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 10px;">${journal.task_description}</div>
          </div>`;
      }
    }
    
    item.innerHTML = `
      <div class="history-icon-wrapper">
        <i class="fa-solid fa-fingerprint"></i>
      </div>
      <div class="history-item-body">
        <div class="h-item-header">
          <span class="h-item-title">${log.status === 'Luar Radius' ? 'Presensi Luar Radius' : 'Kehadiran Harian'}</span>
          <span class="h-item-date">${formatIndoDate(log.date)}</span>
        </div>
        <div class="h-item-details">
          <span><i class="fa-solid fa-right-to-bracket"></i> Datang: <strong>${checkinTimeStr}</strong></span>
          <span><i class="fa-solid fa-right-from-bracket"></i> Pulang: <strong>${checkoutTimeStr}</strong></span>
          <span><i class="fa-solid fa-location-arrow"></i> Jarak: <strong>${log.distance}m</strong></span>
          <span class="status-tag ${labelBadgeClass}">${statusLabel}</span>
        </div>
        ${journalBlock}
      </div>
    `;
    container.appendChild(item);
  });
}

function formatIndoDate(dateStr) {
  const parts = dateStr.split('-');
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  return `${parts[2]} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
}

function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  const partsStart = startDateStr.split('-');
  const partsEnd = endDateStr.split('-');
  const start = new Date(parseInt(partsStart[0]), parseInt(partsStart[1]) - 1, parseInt(partsStart[2]), 12, 0, 0);
  const end = new Date(parseInt(partsEnd[0]), parseInt(partsEnd[1]) - 1, parseInt(partsEnd[2]), 12, 0, 0);
  
  let loop = new Date(start);
  while (loop <= end) {
    const yyyy = loop.getFullYear();
    const mm = String(loop.getMonth() + 1).padStart(2, '0');
    const dd = String(loop.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    loop.setDate(loop.getDate() + 1);
  }
  return dates;
}

// --- 11. ADMIN VIEW LOGIC (KPIs, MAPS, TABLES & CHARTS) ---
function getFilteredAdminLogs() {
  const dateFilter = DOM.adminTableFilterDate ? DOM.adminTableFilterDate.value : 'today';
  let logs = db.attendances;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  if (dateFilter === 'today') {
    // Use WIB (Asia/Jakarta, UTC+7) to get correct local date
    const todayStr = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
    logs = logs.filter(a => a.date === todayStr);
  } else if (dateFilter === 'this_week') {
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(today.setDate(diff));
    startOfWeek.setHours(0,0,0,0);
    logs = logs.filter(a => new Date(a.date) >= startOfWeek);
  } else if (dateFilter === 'this_month') {
    const year = today.getFullYear();
    const month = today.getMonth();
    logs = logs.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  } else if (dateFilter === 'this_year') {
    const year = today.getFullYear();
    logs = logs.filter(a => new Date(a.date).getFullYear() === year);
  } else if (dateFilter === 'custom_range') {
    const start = DOM.filterDateStart.value;
    const end = DOM.filterDateEnd.value;
    if (start && end) {
      logs = logs.filter(a => a.date >= start && a.date <= end);
    } else if (start) {
      logs = logs.filter(a => a.date >= start);
    } else if (end) {
      logs = logs.filter(a => a.date <= end);
    }
  }
  return logs;
}

function renderAdminDashboardKPIs() {
  const filteredLogs = getFilteredAdminLogs();
  const totalEmployees = db.users.filter(u => u.role === 'karyawan').length;
  
  DOM.kpiTotalEmployees.textContent = totalEmployees;
  DOM.kpiPresentCount.textContent = filteredLogs.length;
  
  const presentRate = totalEmployees > 0 ? Math.round((filteredLogs.length / totalEmployees) * 100) : 0;
  DOM.kpiPresentRate.textContent = `${presentRate}% Tingkat Kehadiran`;
  
  // Late counts
  const lateCount = filteredLogs.filter(l => l.status === 'Terlambat').length;
  DOM.kpiLateCount.textContent = lateCount;
  const lateRate = filteredLogs.length > 0 ? Math.round((lateCount / filteredLogs.length) * 100) : 0;
  DOM.kpiLateRate.textContent = `${lateRate}% Dari yang hadir`;
  
  // Out of radius breach count
  const outRadiusCount = filteredLogs.filter(l => l.status === 'Luar Radius').length;
  DOM.kpiOutRadiusCount.textContent = outRadiusCount;
  const safetyRate = filteredLogs.length > 0 ? Math.round(((filteredLogs.length - outRadiusCount) / filteredLogs.length) * 100) : 100;
  DOM.kpiOutRadiusRate.textContent = `Tingkat Kepatuhan GPS: ${safetyRate}%`;
}

function renderAdminRekapJabatan() {
  if (!DOM.adminRekapJabatanBody) return;
  const filteredLogs = getFilteredAdminLogs();
  const employees = db.users.filter(u => u.role === 'karyawan');
  
  // Map standard Jabatan options
  const jabatans = [
    "Tenaga Jasa Kebersihan",
    "Tenaga Jasa Tukang Kebun",
    "Tenaga Jasa Keamanan",
    "Tenaga Jasa Pengemudi"
  ];
  
  // Also include any custom Jabatans that might exist in old data
  employees.forEach(emp => {
    if (!jabatans.includes(emp.position) && emp.position) {
      jabatans.push(emp.position);
    }
  });
  
  DOM.adminRekapJabatanBody.innerHTML = "";
  
  jabatans.forEach(jabatan => {
    const empsInRole = employees.filter(e => e.position === jabatan);
    if (empsInRole.length === 0) return; // Skip if no employees in this role
    
    let totalHadir = 0;
    let totalTelat = 0;
    let totalLuarRadius = 0;
    
    empsInRole.forEach(emp => {
      // Find log for this employee in the filtered logs
      // Note: for multi-day ranges this calculates totals over that range
      const empLogs = filteredLogs.filter(log => log.user_id === emp.id);
      empLogs.forEach(log => {
        if (log.status === 'Hadir') totalHadir++;
        if (log.status === 'Terlambat') totalTelat++;
        if (log.status === 'Luar Radius' || log.status === 'Gagal Verifikasi') totalLuarRadius++;
      });
    });
    
    // For single day (today), "Belum Absen" makes sense. For ranges, it's complex.
    const dateFilter = DOM.adminTableFilterDate ? DOM.adminTableFilterDate.value : 'today';
    let belumAbsenCount = 0;
    if (dateFilter === 'today') {
       belumAbsenCount = empsInRole.length - (totalHadir + totalTelat + totalLuarRadius);
       if (belumAbsenCount < 0) belumAbsenCount = 0;
    } else {
       belumAbsenCount = "-"; // Not applicable for multi-day ranges
    }
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${jabatan}</strong></td>
      <td><div class="user-avatar" style="display:inline-block; width:24px; height:24px; border-radius:50%; background:var(--glass-bg); text-align:center; line-height:24px; margin-right:8px;"><i class="fa-solid fa-users"></i></div>${empsInRole.length} Orang</td>
      <td style="color: var(--success); font-weight: 600;">${totalHadir}</td>
      <td style="color: var(--warning); font-weight: 600;">${totalTelat}</td>
      <td style="color: var(--error); font-weight: 600;">${totalLuarRadius}</td>
      <td style="color: var(--text-tertiary);">${belumAbsenCount}</td>
    `;
    DOM.adminRekapJabatanBody.appendChild(tr);
  });
}

function renderAdminRekapBulanan() {
  if (!DOM.tbodyRekapBulanan) return;
  
  const selectedBulan = DOM.rekapBulan.value;
  const selectedTahun = DOM.rekapTahun.value;
  
  // Calculate days in month
  const daysInMonth = new Date(parseInt(selectedTahun), parseInt(selectedBulan), 0).getDate();
  
  DOM.thTanggalColspan.colSpan = daysInMonth;
  
  let thHtml = '';
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(parseInt(selectedTahun), parseInt(selectedBulan) - 1, i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const dateStr = `${selectedTahun}-${selectedBulan}-${i.toString().padStart(2, '0')}`;
    const isHoliday = db.calendars && db.calendars.some(c => c.date === dateStr);
    const isWeekendOrHoliday = isWeekend || isHoliday;
    thHtml += `<th style="width: 35px; border-right: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); background: ${isWeekendOrHoliday ? 'rgba(255,255,255,0.1)' : 'transparent'}">${i}</th>`;
  }
  DOM.trTanggalHeaders.innerHTML = thHtml;
  
  let tbodyHtml = '';
  const employees = db.users.filter(u => u.role === 'karyawan');
  
  employees.forEach((emp, index) => {
    let rowHtml = `<tr>
      <td style="border-right: 1px solid rgba(255,255,255,0.1); vertical-align: middle;">${index + 1}</td>
      <td style="text-align: left; font-weight: 500; border-right: 1px solid rgba(255,255,255,0.1); vertical-align: middle;">${emp.name}</td>
    `;
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(parseInt(selectedTahun), parseInt(selectedBulan) - 1, i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      
      const dateStr = `${selectedTahun}-${selectedBulan}-${i.toString().padStart(2, '0')}`;
      const isHoliday = db.calendars && db.calendars.some(c => c.date === dateStr);
      const isWeekendOrHoliday = isWeekend || isHoliday;
      
      const att = db.attendances.find(a => a.user_id === emp.id && a.date === dateStr);
      
      let cellContent = '-<br>-';
      if (att) {
        if (att.status === 'Izin' || att.status === 'Sakit' || att.status === 'Cuti' || att.status === 'Mengantar Kepala Dinas') {
          let badgeColor = att.status === 'Izin' ? 'var(--primary)' : 
                           (att.status === 'Sakit' ? 'var(--error)' : 
                           (att.status === 'Cuti' ? 'var(--violet)' : 'var(--warning)'));
          const statusText = att.status === 'Mengantar Kepala Dinas' ? 'Dinas' : att.status;
          cellContent = `<strong style="color: ${badgeColor}; font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase;">${statusText}</strong>`;
        } else {
          const inTime = new Date(att.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const outTime = att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
          
          let inColor = (att.status === 'Terlambat') ? 'var(--warning)' : (att.status === 'Hadir' || att.status === 'Pulang Lebih Awal' ? 'var(--success)' : 'inherit');
          let outColor = (att.status === 'Pulang Lebih Awal') ? 'var(--warning)' : (att.check_out_time ? 'var(--success)' : 'var(--text-secondary)');
          cellContent = `<span style="color: ${inColor}">${inTime}</span><br><span style="color: ${outColor}">${outTime}</span>`;
        }
      }
      
      rowHtml += `<td style="border-right: 1px solid rgba(255,255,255,0.1); background: ${isWeekendOrHoliday ? 'rgba(255,255,255,0.05)' : 'transparent'}; line-height: 1.4;">${cellContent}</td>`;
    }
    
    rowHtml += '</tr>';
    tbodyHtml += rowHtml;
  });
  
  if (employees.length === 0) {
    tbodyHtml = `<tr><td colspan="${daysInMonth + 2}">Belum ada data pegawai.</td></tr>`;
  }
  
  DOM.tbodyRekapBulanan.innerHTML = tbodyHtml;
}

function renderAdminTable() {
  const body = DOM.adminAttendanceTableBody;
  body.innerHTML = "";
  
  const dateFilter = DOM.adminTableFilterDate ? DOM.adminTableFilterDate.value : 'today';
  const isToday = dateFilter === 'today';
  const filteredLogs = getFilteredAdminLogs();
  const searchQuery = DOM.adminTableSearch.value.toLowerCase().trim();
  const statusFilter = DOM.adminTableFilterStatus.value;
  
  let recordsCount = 0;
  
  const renderRow = (emp, log, logDate) => {
    if (searchQuery && !emp.name.toLowerCase().includes(searchQuery)) return;
    if (statusFilter !== 'all') {
      if (!log && statusFilter !== 'Belum Absen' && statusFilter !== 'Gagal Verifikasi') return;
      if (log && log.status !== statusFilter) return;
    }
    
    recordsCount++;
    const tr = document.createElement("tr");
    if (log && log.status === 'Luar Radius') tr.className = "violator";
    
    let timeIn = "-- : --";
    let timeOut = "-- : --";
    let statusHtml = '<span class="status-tag" style="background:rgba(255,255,255,0.03); color:var(--text-tertiary)">Absen</span>';
    let biometricsHtml = '<span class="text-secondary">-</span>';
    let gpsHtml = '<span class="text-secondary">-</span>';
    
    if (log) {
      timeIn = new Date(log.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " WIB";
      if (log.check_out_time) timeOut = new Date(log.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " WIB";
      
      const badgeColor = log.status === 'Hadir' ? 'hadir' : 
                         (log.status === 'Terlambat' ? 'terlambat' : 
                         (log.status === 'Pulang Lebih Awal' ? 'terlambat' : 
                         (log.status === 'Izin' ? 'izin' : 
                         (log.status === 'Sakit' ? 'sakit' : 
                         (log.status === 'Cuti' ? 'cuti' : 
                         (log.status === 'Mengantar Kepala Dinas' ? 'dinas' : 'radius-warning'))))));
      statusHtml = `<span class="status-tag ${badgeColor}">${log.status}</span>`;
      
      biometricsHtml = `<div class="biometric-score-badge" onclick="openPhotoViewerModal('${log.id}')"><i class="fa-solid fa-face-smile"></i> ${log.face_match}% Cocok</div>`;
      let distanceColor = log.status === 'Luar Radius' ? 'var(--error)' : 'var(--success)';
      gpsHtml = `<div class="cell-gps"><span class="gps-dist" style="color: ${distanceColor}"><i class="fa-solid fa-location-dot"></i> ${log.distance} meter</span><span class="gps-coord">${log.latitude_longitude}</span></div>`;
    }
    
    const journal = db.journals.find(j => j.user_id === emp.id && j.date === logDate);
    const journalBtn = journal ? `<button class="btn-read-journal" onclick="openJournalViewerModal('${journal.id}')"><i class="fa-solid fa-eye"></i> Baca Jurnal</button>` : `<button class="btn-read-journal empty" disabled><i class="fa-solid fa-eye-slash"></i> Belum Mengisi</button>`;
    
    let deleteBtn = '-';
    if (log && state.currentUser && state.currentUser.role === 'admin') {
      deleteBtn = `<button class="btn-delete-row" onclick="deleteAttendanceLog('${log.id}')"><i class="fa-solid fa-trash"></i> Hapus</button>`;
    }

    tr.innerHTML = `
      <td><div class="cell-employee"><img class="cell-avatar" src="${emp.photo || 'https://via.placeholder.com/150'}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;" /><div class="cell-meta"><span class="cell-name">${emp.name}</span><span class="cell-role">${emp.position}</span></div></div></td>
      <td>${formatIndoDate(logDate)}</td>
      <td style="font-family: monospace; font-weight: 600;">${timeIn}</td>
      <td style="font-family: monospace; font-weight: 600;">${timeOut}</td>
      <td>${gpsHtml}</td>
      <td>${biometricsHtml}</td>
      <td>${statusHtml}</td>
      <td>${journalBtn}</td>
      <td>${deleteBtn}</td>
    `;
    body.appendChild(tr);
  };
  
  if (isToday) {
    const todayStr = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
    const employees = db.users.filter(u => u.role === 'karyawan');
    employees.forEach(emp => {
      const log = filteredLogs.find(a => a.user_id === emp.id);
      
      // If filtering by "Semua Status", hide employees who haven't checked in yet or were deleted
      if (statusFilter === 'all' && !log) return;
      
      // If filtering by specific status and there's no log, only proceed if looking for "Belum Absen"
      if (statusFilter !== 'all' && !log && statusFilter !== 'Belum Absen') return;
      
      renderRow(emp, log, log ? log.date : todayStr);
    });
  } else {
    // For ranges, sort logs by date descending
    const sortedLogs = [...filteredLogs].sort((a,b) => new Date(b.date) - new Date(a.date));
    sortedLogs.forEach(log => {
      const emp = db.users.find(u => u.id === log.user_id);
      if (emp) renderRow(emp, log, log.date);
    });
  }
  
  if (recordsCount === 0) {
    body.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 40px; color: var(--text-tertiary);"><i class="fa-regular fa-folder-open fa-2x" style="margin-bottom: 10px; display: block;"></i>Tidak ada data kehadiran yang cocok dengan pencarian / filter Anda.</td></tr>`;
  }
}

window.deleteAttendanceLog = function(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus data laporan kehadiran ini secara permanen?')) return;
  const log = db.attendances.find(a => a.id === id);
  if (log) {
    // Delete corresponding journal
    db.journals = db.journals.filter(j => !(j.user_id === log.user_id && j.date === log.date));
  }
  db.attendances = db.attendances.filter(a => a.id !== id);
  db.save();
  renderAdminTable();
  renderAdminDashboardKPIs();
  renderAdminRekapJabatan();
  plotAdminMapRecords();
  renderAdminCharts();
  showToast("Log Dihapus", "Log kehadiran dan jurnal pekerjaan berhasil dihapus secara permanen.", "info");
};

// Generate premium charts using Chart.js
function renderAdminCharts() {
  const statusCtx = document.getElementById('chart-status-distribution');
  const trendsCtx = document.getElementById('chart-checkin-trends');
  if (!statusCtx || !trendsCtx) return;
  
  // Calculate distributions
  const filteredLogs = getFilteredAdminLogs();
  const totalEmployees = db.users.filter(u => u.role === 'karyawan').length;
  
  const hadirCount = filteredLogs.filter(l => l.status === 'Hadir').length;
  const lateCount = filteredLogs.filter(l => l.status === 'Terlambat').length;
  const luarCount = filteredLogs.filter(l => l.status === 'Luar Radius').length;
  
  // For 'Belum Absen', it only makes sense if filtering by today. If multiple days or past dates, absent count logic gets complex. 
  // Let's approximate it for the chart: 
  let absentCount = 0;
  const dateFilter = DOM.adminTableFilterDate ? DOM.adminTableFilterDate.value : 'today';
  if (dateFilter === 'today') {
     absentCount = totalEmployees - filteredLogs.length;
     if (absentCount < 0) absentCount = 0;
  }
  
  // Destroy existing charts to prevent memory leaks or visual glitches
  if (state.charts.statusDoughnut) state.charts.statusDoughnut.destroy();
  if (state.charts.trendsLine) state.charts.trendsLine.destroy();
  
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = 'Inter';
  
  // Doughnut status chart
  state.charts.statusDoughnut = new Chart(statusCtx, {
    type: 'doughnut',
    data: {
      labels: ['Tepat Waktu', 'Terlambat', 'Luar Radius', 'Belum Absen'],
      datasets: [{
        data: [hadirCount, lateCount, luarCount, absentCount],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', 'rgba(255,255,255,0.06)'],
        borderColor: ['#09090b', '#09090b', '#09090b', '#09090b'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { boxWidth: 10, padding: 12, font: { size: 9 } }
        }
      },
      cutout: '65%'
    }
  });
  
  // Line trends check-in hours chart
  const hourBuckets = Array(6).fill(0); // 07.00, 07.30, 08.00, 08.30, 09.00, >09.00
  
  filteredLogs.forEach(log => {
    if (!log.check_in_time) return;
    const time = new Date(log.check_in_time);
    const hr = time.getHours();
    const min = time.getMinutes();
    
    if (hr < 7) hourBuckets[0]++;
    else if (hr === 7 && min < 30) hourBuckets[0]++;
    else if (hr === 7 && min >= 30) hourBuckets[1]++;
    else if (hr === 8 && min < 15) hourBuckets[2]++;
    else if (hr === 8 && min >= 15) hourBuckets[3]++;
    else if (hr === 9) hourBuckets[4]++;
    else hourBuckets[5]++;
  });
  
  state.charts.trendsLine = new Chart(trendsCtx, {
    type: 'line',
    data: {
      labels: ['07:00', '07:30', '08:00', '08:30', '09:00', '>09:30'],
      datasets: [{
        label: 'Frekuensi Kehadiran',
        data: hourBuckets,
        fill: true,
        backgroundColor: 'rgba(6, 182, 212, 0.08)',
        borderColor: '#06b6d4',
        borderWidth: 2,
        tension: 0.35,
        pointBackgroundColor: '#06b6d4'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { stepSize: 1, precision: 0 } },
        x: { grid: { color: 'rgba(255,255,255,0.03)' } }
      }
    }
  });
}

// Open modal viewers
window.openJournalViewerModal = function(journalId) {
  const journal = db.journals.find(j => j.id === journalId);
  if (!journal) return;
  const user = db.users.find(u => u.id === journal.user_id);
  if (!user) return;
  
  DOM.modalJournalAvatar.textContent = user.avatar;
  DOM.modalJournalEmployeeName.textContent = user.name;
  DOM.modalJournalDateRole.textContent = `${user.position} • ${formatIndoDate(journal.date)}`;
  DOM.modalJournalTextContent.textContent = journal.task_description;
  
  // Show verification status inside modal
  let verifBadge = document.getElementById('modal-journal-verif-badge');
  if (!verifBadge) {
    verifBadge = document.createElement('div');
    verifBadge.id = 'modal-journal-verif-badge';
    verifBadge.style.cssText = 'margin-top: 12px; padding: 8px 14px; border-radius: 8px; font-size: 0.82rem; display: flex; align-items: center; gap: 8px;';
    DOM.modalJournalTextContent.parentNode.insertBefore(verifBadge, DOM.modalJournalTextContent);
  }
  if (journal.verified) {
    const vTime = new Date(journal.verified_at).toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' });
    verifBadge.style.background = 'rgba(34,197,94,0.12)';
    verifBadge.style.border = '1px solid rgba(34,197,94,0.35)';
    verifBadge.style.color = 'var(--success)';
    verifBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>Terverifikasi</strong> oleh ${journal.verified_by} pada ${vTime}`;
    DOM.btnVerifyJournal.disabled = true;
    DOM.btnVerifyJournal.innerHTML = '<i class="fa-solid fa-circle-check"></i> Sudah Diverifikasi';
    DOM.btnVerifyJournal.style.opacity = '0.6';
  } else {
    verifBadge.style.background = 'rgba(251,191,36,0.1)';
    verifBadge.style.border = '1px solid rgba(251,191,36,0.3)';
    verifBadge.style.color = 'var(--warning)';
    verifBadge.innerHTML = `<i class="fa-solid fa-clock"></i> Belum diverifikasi oleh pengawas`;
    DOM.btnVerifyJournal.disabled = false;
    DOM.btnVerifyJournal.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verifikasi Jurnal';
    DOM.btnVerifyJournal.style.opacity = '1';
  }
  
  DOM.modalJournalViewer.classList.remove('hidden');
  
  // Bind export PDF & verify buttons for this specific journal
  DOM.btnExportJournalPdf.onclick = () => exportJournalToPDF(user, journal.date);
  DOM.btnVerifyJournal.onclick = () => {
    if (journal.verified) return;
    const verifierName = state.currentUser ? state.currentUser.name : 'Admin';
    db.verifyJournal(journal.id, verifierName);
    DOM.modalJournalViewer.classList.add('hidden');
    showToast('Jurnal Diverifikasi', `Laporan kerja ${user.name} pada ${formatIndoDate(journal.date)} telah disetujui.`, 'success');
    // Refresh admin table to reflect new status
    if (typeof renderAdminTable === 'function') renderAdminTable();
  };
};

window.openPhotoViewerModal = function(attendanceId) {
  const log = db.attendances.find(a => a.id === attendanceId);
  if (!log) return;
  const user = db.users.find(u => u.id === log.user_id);
  if (!user) return;
  
  // Show photo or placeholder if no photo available
  if (log.photo_url && log.photo_url.length > 10) {
    DOM.modalAttendancePhoto.src = log.photo_url;
    DOM.modalAttendancePhoto.style.objectFit = 'cover';
    DOM.modalAttendancePhoto.style.filter = 'none';
  } else {
    // Generate placeholder with user initials
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(200, 130, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.avatar || user.name.substring(0, 2).toUpperCase(), 200, 130);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Foto tidak tersedia - Absen sebelum fitur foto ditambahkan', 200, 250);
    DOM.modalAttendancePhoto.src = canvas.toDataURL();
    DOM.modalAttendancePhoto.style.objectFit = 'contain';
  }
  
  DOM.modalPhotoEmployeeName.textContent = user.name;
  DOM.modalPhotoTimestamp.textContent = `Waktu Datang: ${new Date(log.check_in_time).toLocaleTimeString('id-ID')} WIB • ${formatIndoDate(log.date)}`;
  
  if (log.face_match) {
    DOM.modalPhotoMatchRate.textContent = `Kecocokan AI Biometrik: ${log.face_match}% (TERVERIFIKASI ASLI)`;
    DOM.modalPhotoMatchRate.style.color = 'var(--success)';
  } else {
    DOM.modalPhotoMatchRate.textContent = `Data biometrik tidak tersedia`;
    DOM.modalPhotoMatchRate.style.color = 'var(--text-muted)';
  }
  
  DOM.modalPhotoViewer.classList.remove('hidden');
};

// --- 12. EXPORT TO CSV CONVERTER ---
function exportAttendanceToCSV() {
  const logs = getFilteredAdminLogs();
  
  if (logs.length === 0) {
    alert("Tidak ada data kehadiran untuk diekspor pada rentang ini.");
    return;
  }
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Nama Karyawan,Posisi,Tanggal,Jam Datang,Jam Pulang,Jarak Geofence (Meter),Koordinat GPS,Kecocokan Wajah AI,Status Kehadiran,Laporan Jurnal Harian\n";
  
  logs.forEach(log => {
    const user = db.users.find(u => u.id === log.user_id);
    const journal = db.journals.find(j => j.user_id === log.user_id && j.date === log.date);
    const name = user ? user.name : "N/A";
    const pos = user ? user.position : "N/A";
    const cin = new Date(log.check_in_time).toLocaleTimeString('id-ID');
    const cout = log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString('id-ID') : "-";
    const jText = journal ? journal.task_description.replace(/"/g, '""').replace(/\n/g, ' ') : "-";
    
    csvContent += `"${name}","${pos}","${log.date}","${cin}","${cout}",${log.distance},"${log.latitude_longitude}",${log.face_match}%,"${log.status}","${jText}"\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Laporan_Absen_Outsourcing.csv`);
  document.body.appendChild(link); // Required for FF
  
  link.click();
  document.body.removeChild(link);
  
  showToast("Laporan Diekspor", "Laporan kehadiran berhasil diunduh sebagai file CSV.", "success");
}

// --- 12.B EMPLOYEE MANAGEMENT LOGIC ---
function renderAdminEmployees() {
  if (!DOM.adminEmployeeTableBody) return;
  const employees = db.users.filter(u => u.role === 'karyawan');
  DOM.adminEmployeeTableBody.innerHTML = '';
  
  employees.forEach(emp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="cell-employee">
          <div class="user-avatar" style="width: 28px; height: 28px; font-size: 0.7rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--accent); color: white;">${emp.avatar}</div>
          <span class="cell-name">${emp.name}</span>
        </div>
      </td>
      <td>${emp.email}</td>
      <td>${emp.position}</td>
      <td>
        <select class="filter-dropdown" style="background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: white; padding: 4px; border-radius: 4px;" onchange="updateEmployeeShift('${emp.id}', this.value)">
          <option value="siang" ${emp.shift === 'siang' || !emp.shift ? 'selected' : ''}>Siang</option>
          <option value="malam" ${emp.shift === 'malam' ? 'selected' : ''}>Malam</option>
        </select>
      </td>
      <td>
        ${state.currentUser && state.currentUser.role === 'admin' ? `<button class="btn-delete-row" onclick="deleteEmployee('${emp.id}')">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>` : '<span style="color:var(--text-tertiary); font-size:0.8rem;">-</span>'}
      </td>
    `;
    DOM.adminEmployeeTableBody.appendChild(tr);
  });
}

function renderAdminSupervisors() {
  const tbody = document.getElementById('admin-supervisor-table-body');
  if (!tbody) return;
  const supervisors = db.users.filter(u => u.role === 'pengawas');
  tbody.innerHTML = '';
  
  supervisors.forEach(spv => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="cell-employee">
          <div class="user-avatar" style="width: 28px; height: 28px; font-size: 0.7rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--violet); color: white;">${spv.avatar}</div>
          <span class="cell-name">${spv.name}</span>
        </div>
      </td>
      <td>${spv.email}</td>
      <td>
        ${state.currentUser && state.currentUser.role === 'admin' ? `<button class="btn-delete-row" onclick="deleteSupervisor('${spv.id}')">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>` : '<span style="color:var(--text-tertiary); font-size:0.8rem;">-</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  if (supervisors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 20px; color: var(--text-secondary);">Belum ada pengawas yang diatur.</td></tr>';
  }
}

window.deleteSupervisor = function(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus pengawas ini? Seluruh log kehadirannya akan tetap ada namun profilnya terhapus.')) return;
  db.users = db.users.filter(u => u.id !== id);
  db.save();
  renderAdminSupervisors();
  renderAdminTable();
  renderAdminDashboardKPIs();
  renderAdminRekapJabatan();
  populateRekapJurnalKaryawanDropdown();
  showToast("Pengawas Dihapus", "Pengawas berhasil dihapus dari sistem.", "info");
};

window.deleteEmployee = function(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus karyawan ini? Seluruh log kehadirannya akan tetap ada namun profilnya terhapus.')) return;
  db.users = db.users.filter(u => u.id !== id);
  db.save();
  renderAdminEmployees();
  renderAdminTable();
  renderAdminDashboardKPIs();
  renderAdminRekapJabatan();
  populateRekapJurnalKaryawanDropdown();
  showToast("Pegawai Dihapus", "Pegawai berhasil dihapus dari sistem.", "info");
};

window.updateEmployeeShift = function(id, shift) {
  const user = db.users.find(u => u.id === id);
  if (user) {
    user.shift = shift;
    db.save();
    showToast("Shift Diperbarui", `Shift untuk ${user.name} diubah menjadi ${shift.toUpperCase()}`, "success");
  }
};

// --- 12.C CALENDAR MANAGEMENT LOGIC ---
function renderAdminCalendars() {
  if (!DOM.adminCalendarTableBody) return;
  const calendars = db.calendars || [];
  DOM.adminCalendarTableBody.innerHTML = '';
  
  // Sort by date descending
  calendars.sort((a,b) => new Date(b.date) - new Date(a.date));
  
  calendars.forEach(cal => {
    let typeBadge = '';
    if (cal.type === 'Libur Nasional') typeBadge = '<span class="status-tag hadir">Libur Nasional</span>';
    else if (cal.type === 'Cuti Bersama') typeBadge = '<span class="status-tag terlambat">Cuti Bersama</span>';
    else typeBadge = '<span class="status-tag radius-warning">Lainnya</span>';
    
    const canDelete = state.currentUser && state.currentUser.role === 'admin';
    const deleteBtnHtml = canDelete 
      ? `<button class="btn-delete-row" onclick="deleteCalendar('${cal.id}')"><i class="fa-solid fa-trash"></i></button>` 
      : `<span style="color:var(--text-tertiary); font-size:0.8rem;">-</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${formatIndoDate(cal.date)}</strong></td>
      <td>${cal.title}</td>
      <td>${typeBadge}</td>
      <td>${deleteBtnHtml}</td>
    `;
    DOM.adminCalendarTableBody.appendChild(tr);
  });
  
  if (calendars.length === 0) {
    DOM.adminCalendarTableBody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 20px;">Belum ada hari libur yang diatur.</td></tr>';
  }
}

window.deleteCalendar = function(id) {
  if (!confirm('Hapus hari libur ini?')) return;
  db.calendars = db.calendars.filter(c => c.id !== id);
  db.save();
  renderAdminCalendars();
  renderAdminRekapBulanan();
  showToast("Dihapus", "Hari libur berhasil dihapus.", "info");
};

// --- 12.C REKAP JURNAL BULANAN ---
function populateRekapJurnalKaryawanDropdown() {
  const sel = document.getElementById('rekap-jurnal-karyawan');
  if (!sel) return;
  const employees = db.users.filter(u => u.role === 'karyawan');
  sel.innerHTML = '<option value="">-- Pilih Karyawan --</option>';
  employees.forEach(emp => {
    sel.innerHTML += `<option value="${emp.id}">${emp.name} — ${emp.position}</option>`;
  });
}

function renderRekapJurnalBulanan() {
  const empId  = document.getElementById('rekap-jurnal-karyawan').value;
  const bulan  = document.getElementById('rekap-jurnal-bulan').value;
  const tahun  = document.getElementById('rekap-jurnal-tahun').value;
  const content = document.getElementById('rekap-jurnal-content');

  if (!empId) {
    content.innerHTML = '<p style="color:var(--warning); text-align:center; padding:20px 0;"><i class="fa-solid fa-triangle-exclamation"></i> Pilih nama karyawan terlebih dahulu.</p>';
    return;
  }

  const emp = db.users.find(u => u.id === empId);
  if (!emp) return;

  const bulanText = document.getElementById('rekap-jurnal-bulan').options[document.getElementById('rekap-jurnal-bulan').selectedIndex].text;
  const daysInMonth = new Date(parseInt(tahun), parseInt(bulan), 0).getDate();

  // Collect verified journals for this employee this month
  const journals = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${tahun}-${bulan}-${i.toString().padStart(2, '0')}`;
    const j = db.journals.find(j => j.user_id === empId && j.date === dateStr && j.verified === true);
    if (j) journals.push(j);
  }

  if (journals.length === 0) {
    content.innerHTML = `<p style="color:var(--text-secondary); text-align:center; padding:30px 0;"><i class="fa-regular fa-folder-open"></i> Belum ada jurnal yang telah diverifikasi untuk <strong>${emp.name}</strong> pada periode ${bulanText} ${tahun}.</p>`;
    return;
  }

  let rowsHtml = '';
  journals.forEach((j, idx) => {
    const d = new Date(j.date);
    const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
    const dateLabel = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const verifiedTime = new Date(j.verified_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    rowsHtml += `
      <tr>
        <td style="text-align:center; vertical-align:top; padding: 10px; width: 36px;">${idx + 1}</td>
        <td style="vertical-align:top; padding: 10px; white-space: nowrap; width: 160px;">
          <strong>${dateLabel}</strong><br>
          <span style="color:var(--text-secondary); font-size:0.82rem;">${dayName}</span>
        </td>
        <td style="vertical-align:top; padding: 10px; line-height: 1.7; white-space: pre-wrap;">${j.task_description}</td>
        <td style="text-align:center; vertical-align:top; padding: 10px; white-space: nowrap;">
          <span style="font-size:0.78rem; color:var(--success);"><i class="fa-solid fa-circle-check"></i> ${j.verified_by}</span><br>
          <span style="font-size:0.72rem; color:var(--text-tertiary);">${verifiedTime}</span>
        </td>
      </tr>`;
  });

  content.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="modern-table" style="width:100%; font-size:0.88rem;">
        <thead>
          <tr>
            <th style="text-align:center; width:36px;">No</th>
            <th style="width:160px;">Tanggal</th>
            <th>Uraian Kegiatan / Jurnal Harian</th>
            <th style="text-align:center; white-space:nowrap;">Diverifikasi Oleh</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <p style="color:var(--text-tertiary); font-size:0.8rem; margin-top:12px; text-align:right;">
      Total ${journals.length} jurnal terverifikasi pada ${bulanText} ${tahun}.
    </p>`;
}

function exportRekapJurnalPDF() {
  const empId     = document.getElementById('rekap-jurnal-karyawan').value;
  const bulan     = document.getElementById('rekap-jurnal-bulan').value;
  const tahun     = document.getElementById('rekap-jurnal-tahun').value;
  const bulanText = document.getElementById('rekap-jurnal-bulan').options[document.getElementById('rekap-jurnal-bulan').selectedIndex].text;

  if (!empId) {
    showToast('Pilih Karyawan', 'Pilih nama karyawan sebelum mencetak PDF.', 'warning');
    return;
  }
  if (!window.jspdf) {
    showToast('Gagal', 'Library PDF belum termuat.', 'error');
    return;
  }

  const emp = db.users.find(u => u.id === empId);
  if (!emp) return;

  const daysInMonth = new Date(parseInt(tahun), parseInt(bulan), 0).getDate();
  const journals = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${tahun}-${bulan}-${i.toString().padStart(2, '0')}`;
    const j = db.journals.find(j => j.user_id === empId && j.date === dateStr && j.verified === true);
    if (j) journals.push(j);
  }

  if (journals.length === 0) {
    showToast('Tidak Ada Data', 'Belum ada jurnal terverifikasi untuk dicetak.', 'warning');
    return;
  }

  const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, margin = 18;

  // ---- KOP SURAT ----
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN JURNAL KERJA BULANAN', W / 2, 18, { align: 'center' });
  doc.text('TENAGA OUTSOURCING', W / 2, 24, { align: 'center' });
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('Dinas Kependudukan dan Pencatatan Sipil Kabupaten Murung Raya', W / 2, 30, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(margin, 33, W - margin, 33);

  // ---- INFO PEGAWAI ----
  doc.setFontSize(10);
  doc.text(`Nama Pegawai  : ${emp.name}`, margin, 40);
  doc.text(`Jabatan           : ${emp.position || '-'}`, margin, 46);
  doc.text(`Periode           : ${bulanText} ${tahun}`, margin, 52);
  doc.text(`Shift Kerja       : ${emp.shift === 'malam' ? 'Malam' : 'Siang'}`, margin, 58);
  doc.line(margin, 61, W - margin, 61);

  // ---- TABLE ----
  const tableHead = [['No', 'Hari / Tanggal', 'Uraian Kegiatan / Aktivitas Kerja', 'Verifikasi']];
  const tableBody = journals.map((j, idx) => {
    const d = new Date(j.date);
    const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const verifiedInfo = `${j.verified_by}\n${new Date(j.verified_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    return [String(idx + 1), dayLabel, j.task_description, verifiedInfo];
  });

  doc.autoTable({
    head: tableHead,
    body: tableBody,
    startY: 65,
    theme: 'grid',
    headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255], fontSize: 9, halign: 'center', valign: 'middle' },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3, valign: 'top', lineColor: [200, 200, 200] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 40 },
      2: { cellWidth: 105 },
      3: { cellWidth: 27, halign: 'center', fontSize: 7.5 }
    },
    margin: { left: margin, right: margin }
  });

  // ---- TANDA TANGAN ----
  let finalY = doc.lastAutoTable.finalY + 14;
  if (finalY > 240) { doc.addPage(); finalY = 20; }

  // Tanggal cetak dokumen
  const today = new Date();
  const cetakTanggal = today.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  doc.setFontSize(9);
  const sigY = finalY;
  const leftX = margin;
  const rightX = W - margin - 27.5; // center of right signature column

  // -- Kiri: Mengetahui --
  doc.setFont('helvetica', 'normal');
  doc.text('Mengetahui,', leftX, sigY);
  doc.text('Kepala Sub Bagian Umum dan Kepegawaian,', leftX, sigY + 5);

  // Spasi untuk tanda tangan (tanpa kotak) — 30mm tinggi
  const sigSpaceH = 30;

  // -- Kanan: Yang Membuat --
  doc.text(`Puruk Cahu, ${cetakTanggal}`, rightX, sigY, { align: 'center' });
  doc.text('Yang Membuat Laporan,', rightX, sigY + 5, { align: 'center' });

  // Nama & identitas bawah kiri (setelah spasi tanda tangan)
  const nameY = sigY + sigSpaceH + 3;
  doc.setFont('helvetica', 'bold');
  doc.text('TUTI HERYATI, S.E., M.M.', leftX, nameY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Penata III/c', leftX, nameY + 10);
  doc.text('NIP. 197805022007012025', leftX, nameY + 15);


  // Nama & jabatan bawah kanan
  doc.setFont('helvetica', 'bold');
  doc.text(emp.name, rightX, nameY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(emp.position || '', rightX, nameY + 10, { align: 'center' });


  // ---- FOOTER ----
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setTextColor(130, 130, 130);
    doc.text(
      `Dicetak oleh: ${state.currentUser ? state.currentUser.name : 'Admin'} | Halaman ${p} dari ${pageCount}`,
      W / 2, 292, { align: 'center' }
    );
  }

  doc.save(`Jurnal_Bulanan_${emp.name.replace(/\s+/g, '_')}_${bulanText}_${tahun}.pdf`);
  showToast('Sukses', `Laporan Jurnal Bulanan ${emp.name} berhasil dicetak.`, 'success');
}

// --- 12.D PDF EXPORT LOGIC (jsPDF) ---

function exportJournalToPDF(user, dateStr) {
  if (!window.jspdf) {
    showToast("Gagal", "Library PDF belum termuat. Pastikan koneksi internet stabil.", "error");
    return;
  }
  
  const doc = new window.jspdf.jsPDF();
  
  // Get all journals in that month
  const [year, month] = dateStr.split('-');
  const journals = db.journals.filter(j => j.user_id === user.id && j.date.startsWith(`${year}-${month}`));
  
  doc.setFontSize(16);
  doc.text("Laporan Jurnal Harian Pekerjaan (Outsourcing)", 14, 20);
  
  doc.setFontSize(11);
  doc.text(`Nama Pegawai  : ${user.name}`, 14, 30);
  doc.text(`Jabatan       : ${user.position}`, 14, 36);
  doc.text(`Periode Bulan : ${month} - ${year}`, 14, 42);
  
  doc.setLineWidth(0.5);
  doc.line(14, 48, 196, 48);
  
  const tableData = journals.sort((a,b) => new Date(a.date) - new Date(b.date)).map(j => [
    formatIndoDate(j.date),
    j.task_description
  ]);
  
  doc.autoTable({
    startY: 55,
    head: [['Tanggal', 'Rincian Pekerjaan Harian']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [6, 182, 212] },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 35 } }
  });
  
  doc.save(`Jurnal_${user.name.replace(/\s+/g,'_')}_${month}_${year}.pdf`);
  showToast("Sukses", "Jurnal harian berhasil dicetak menjadi PDF.", "success");
}

window.exportRekapBulanan = function() {
  if (!window.jspdf) {
    showToast("Gagal", "Library PDF belum termuat. Pastikan koneksi internet stabil.", "error");
    return;
  }

  const selectedBulan = DOM.rekapBulan.value;
  const selectedTahunStr = DOM.rekapTahun.value;
  const selectedBulanText = DOM.rekapBulan.options[DOM.rekapBulan.selectedIndex].text;
  const daysInMonth = new Date(parseInt(selectedTahunStr), parseInt(selectedBulan), 0).getDate();

  const employees = db.users.filter(u => u.role === 'karyawan');

  // --- Build header row ---
  const dayHeaders = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${selectedTahunStr}-${selectedBulan}-${i.toString().padStart(2, '0')}`;
    const d = new Date(parseInt(selectedTahunStr), parseInt(selectedBulan) - 1, i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isHoliday = db.calendars && db.calendars.some(c => c.date === dateStr);
    const isWeekendOrHoliday = isWeekend || isHoliday;
    
    const cellStyle = {
      halign: 'center',
      fontSize: 6,
      cellWidth: 7
    };
    
    if (isWeekendOrHoliday) {
      cellStyle.fillColor = [220, 220, 220];
      cellStyle.textColor = [50, 50, 50]; // Dark gray text for light gray background
    } else {
      cellStyle.fillColor = [64, 64, 64];
      cellStyle.textColor = [255, 255, 255]; // White text for dark gray background
    }

    dayHeaders.push({
      content: String(i),
      styles: cellStyle
    });
  }
  const tableHead = [
    [
      { content: 'No',   rowSpan: 2, styles: { valign: 'middle', halign: 'center', cellWidth: 8 } },
      { content: 'Nama', rowSpan: 2, styles: { valign: 'middle', halign: 'left',   cellWidth: 38 } },
      { content: 'Tanggal', colSpan: daysInMonth, styles: { halign: 'center' } }
    ],
    dayHeaders
  ];

  // --- Build body rows ---
  const tableBody = employees.map((emp, index) => {
    const row = [
      { content: String(index + 1), styles: { halign: 'center', valign: 'middle' } },
      { content: emp.name, styles: { halign: 'left', valign: 'middle' } }
    ];

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${selectedTahunStr}-${selectedBulan}-${i.toString().padStart(2, '0')}`;
      const att = db.attendances.find(a => a.user_id === emp.id && a.date === dateStr);
      const d = new Date(parseInt(selectedTahunStr), parseInt(selectedBulan) - 1, i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isHoliday = db.calendars && db.calendars.some(c => c.date === dateStr);
      const isWeekendOrHoliday = isWeekend || isHoliday;

      if (att) {
        if (att.status === 'Izin' || att.status === 'Sakit' || att.status === 'Cuti' || att.status === 'Mengantar Kepala Dinas') {
          const isDinas = att.status === 'Mengantar Kepala Dinas';
          const statusText = isDinas ? 'DINAS' : att.status.toUpperCase();
          let textColor = att.status === 'Izin' ? [6, 182, 212] : 
                          (att.status === 'Sakit' ? [239, 68, 68] : 
                          (att.status === 'Cuti' ? [139, 92, 246] : [245, 158, 11]));
          row.push({
            content: statusText,
            styles: {
              halign: 'center',
              fontSize: isDinas ? 4.2 : 6,
              textColor: textColor,
              fillColor: isWeekendOrHoliday ? [240, 240, 240] : null,
              cellPadding: isDinas ? 0.5 : 1
            }
          });
        } else if (att.check_in_time) {
          const inTime = new Date(att.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const outTime = att.check_out_time
            ? new Date(att.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : '-';
          const isLateOrEarly = att.status === 'Terlambat' || att.status === 'Pulang Lebih Awal';
          row.push({
            content: `${inTime}\n${outTime}`,
            styles: {
              halign: 'center',
              fontSize: 6,
              textColor: isLateOrEarly ? [200, 100, 0] : [21, 128, 61],
              fillColor: isWeekendOrHoliday ? [240, 240, 240] : null,
              cellPadding: 1
            }
          });
        }
      } else {
        row.push({
          content: isWeekendOrHoliday ? '' : '-',
          styles: {
            halign: 'center',
            fontSize: 6,
            fillColor: isWeekendOrHoliday ? [240, 240, 240] : null,
            textColor: [150, 150, 150]
          }
        });
      }
    }
    return row;
  });

  if (employees.length === 0) {
    tableBody.push([{ content: 'Belum ada data pegawai.', colSpan: daysInMonth + 2, styles: { halign: 'center' } }]);
  }

  // --- Generate PDF ---
  const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("REKAPITULASI KEHADIRAN BULANAN TENAGA OUTSOURCING", 148, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("Dinas Kependudukan dan Pencatatan Sipil Kabupaten Murung Raya", 148, 20, { align: 'center' });
  doc.text(`Periode: ${selectedBulanText} ${selectedTahunStr}`, 148, 26, { align: 'center' });

  doc.autoTable({
    head: tableHead,
    body: tableBody,
    startY: 32,
    theme: 'grid',
    headStyles: { fillColor: [64, 64, 64], textColor: [255, 255, 255], fontSize: 7, halign: 'center', valign: 'middle' },
    styles: { font: 'helvetica', fontSize: 6.5, cellPadding: 1.5, valign: 'middle', lineColor: [180, 180, 180] },
    columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 38, halign: 'left' } },
    margin: { left: 8, right: 8 }
  });

  // --- Signature Block ---
  const finalY = doc.previousAutoTable.finalY;
  const pageHeight = doc.internal.pageSize.getHeight();
  const signatureHeight = 45;
  const bottomMargin = 15;
  
  let currentY = finalY + 12;
  if (currentY + signatureHeight > pageHeight - bottomMargin) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  
  // Left side headers
  doc.text("Mengetahui,", 15, currentY);
  doc.text("KEPALA DINAS", 15, currentY + 4);
  doc.text("KEPENDUDUKAN DAN PENCATATAN SIPIL", 15, currentY + 8);
  doc.text("KABUPATEN MURUNG RAYA", 15, currentY + 12);
  
  // Right side headers
  const today = new Date();
  const printDay = today.getDate();
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const printMonth = monthNames[today.getMonth()];
  const printYear = today.getFullYear();
  doc.text(`Puruk Cahu, ${printDay} ${printMonth} ${printYear}`, 210, currentY);
  doc.text("KASUBBAG UMUM DAN KEPEGAWAIAN", 210, currentY + 4);
  
  // Names (Bold)
  doc.setFont('helvetica', 'bold');
  doc.text("GEMA TOPANDAS TIDJA, S.Sos., M.M", 15, currentY + 32);
  doc.text("TUTI HERYATI, S.E., M.M", 210, currentY + 32);
  
  // NIP / Rank (Normal)
  doc.setFont('helvetica', 'normal');
  doc.text("Pembina Tingkat I (IV/b)", 15, currentY + 36);
  doc.text("NIP. 19781005 200701 1 008", 15, currentY + 40);
  
  doc.text("Penata (III/c)", 210, currentY + 36);
  doc.text("NIP. 19780502 200701 2 025", 210, currentY + 40);

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.text(`Dicetak oleh: ${state.currentUser ? state.currentUser.name : 'Admin'} | Halaman ${p} dari ${pageCount}`, 148, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
  }

  doc.save(`Rekap_Kehadiran_${selectedBulanText}_${selectedTahunStr}.pdf`);
  showToast("Sukses", `Rekap Bulanan ${selectedBulanText} ${selectedTahunStr} berhasil dicetak.`, "success");
}

// --- 13. LOGIN & ROUTING HANDLERS ---
async function handleLoginSubmit(e) {
  e.preventDefault();
  
  const email = DOM.loginEmail.value.trim();
  const password = DOM.loginPassword.value;
  const selectedRole = document.querySelector('input[name="login-role"]:checked').value;
  
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json());
    
    if (!res.success) {
      showToast("Gagal Otentikasi", "Email dinas atau kata sandi Anda salah.", "error");
      return;
    }
    
    const user = res.user;
    if (user.role !== selectedRole && !(selectedRole === 'admin' && user.role === 'pengawas')) {
      const roleLabel = selectedRole === 'admin' ? 'Admin/Pengawas' : 'Karyawan';
      showToast("Hak Akses Ditolak", `Akun Anda tidak memiliki otoritas sebagai ${roleLabel}.`, "warning");
      return;
    }
    
    // Sync all data from backend for this session
    await db.syncFromBackend();
    
    loginSessionStart(user);
  } catch (err) {
    showToast("Error", "Gagal menghubungkan ke server.", "error");
  }
}

function loginSessionStart(user) {
  state.currentUser = user;
  
  // Show Navbar Badge
  DOM.userProfileBadge.classList.remove('hidden');
  DOM.navAvatarInitials.textContent = user.avatar;
  DOM.navUserName.textContent = user.name;
  DOM.navUserRole.textContent = user.role === 'admin' ? 'Administrator' : (user.role === 'pengawas' ? 'Pengawas' : user.position);
  
  // View Routing
  DOM.viewLogin.classList.remove('active');
  DOM.viewLogin.classList.add('hidden');
  
  if (user.role === 'admin' || user.role === 'pengawas') {
    DOM.viewAdmin.classList.add('active');
    DOM.viewAdmin.classList.remove('hidden');
    
    // Set map inputs
    if (DOM.adminOfficeLat) DOM.adminOfficeLat.value = OFFICE_LAT;
    if (DOM.adminOfficeLng) DOM.adminOfficeLng.value = OFFICE_LNG;
    
    // Set Shift config
    if (DOM.adminShiftSiangIn) DOM.adminShiftSiangIn.value = SHIFT_CONFIG.siang.in;
    if (DOM.adminShiftSiangOut) DOM.adminShiftSiangOut.value = SHIFT_CONFIG.siang.out;
    if (DOM.adminShiftMalamIn) DOM.adminShiftMalamIn.value = SHIFT_CONFIG.malam.in;
    if (DOM.adminShiftMalamOut) DOM.adminShiftMalamOut.value = SHIFT_CONFIG.malam.out;
    
    // Pengawas: hide admin-only controls
    const isPengawas = user.role === 'pengawas';
    
    // Employee modal
    const addEmpBtn = document.getElementById('btn-add-employee-modal');
    if (addEmpBtn) addEmpBtn.style.display = isPengawas ? 'none' : '';

    // Supervisor management card
    const supervisorMgmtPanel = document.getElementById('admin-supervisor-mgmt-panel');
    if (supervisorMgmtPanel) supervisorMgmtPanel.style.display = isPengawas ? 'none' : '';

    const gridContainer = document.querySelector('.admin-grid-management');
    if (gridContainer) {
      if (isPengawas) {
        gridContainer.classList.remove('admin-view');
      } else {
        gridContainer.classList.add('admin-view');
      }
    }

    // Radar Koordinat Kantor
    const btnUpdateOffice = document.getElementById('btn-update-office-gps');
    if (btnUpdateOffice) btnUpdateOffice.style.display = isPengawas ? 'none' : '';
    if (DOM.adminOfficeLat) DOM.adminOfficeLat.disabled = isPengawas;
    if (DOM.adminOfficeLng) DOM.adminOfficeLng.disabled = isPengawas;

    // Shift Pengaturan
    const btnSaveShift = document.getElementById('btn-save-shift-config');
    if (btnSaveShift) btnSaveShift.style.display = isPengawas ? 'none' : '';
    if (DOM.adminShiftSiangIn) DOM.adminShiftSiangIn.disabled = isPengawas;
    if (DOM.adminShiftSiangOut) DOM.adminShiftSiangOut.disabled = isPengawas;
    if (DOM.adminShiftMalamIn) DOM.adminShiftMalamIn.disabled = isPengawas;
    if (DOM.adminShiftMalamOut) DOM.adminShiftMalamOut.disabled = isPengawas;

    // Manajemen Kalender
    const btnAddCalendar = document.getElementById('btn-add-calendar-modal');
    if (btnAddCalendar) btnAddCalendar.style.display = isPengawas ? 'none' : '';
    
    renderAdminDashboardKPIs();
    renderAdminRekapJabatan();
    renderAdminEmployees();
    renderAdminSupervisors();
    renderAdminCalendars();
    renderAdminPermits();
    renderAdminTable();
    renderAdminCharts();
    populateRekapJurnalKaryawanDropdown();
    initLeafletMaps();
  } else {
    DOM.viewKaryawan.classList.add('active');
    DOM.viewKaryawan.classList.remove('hidden');
    
    // Dynamically populate permits dropdown based on user position
    const permitTypeSelect = document.getElementById('permit-type');
    if (permitTypeSelect) {
      permitTypeSelect.innerHTML = `
        <option value="izin">Izin Tidak Masuk Kerja (Maks 1 Hari)</option>
        <option value="sakit">Sakit</option>
        <option value="cuti">Cuti Tahunan</option>
      `;
      if (user.position === 'Tenaga Jasa Pengemudi') {
        const opt = document.createElement('option');
        opt.value = 'mengantar_kepala_dinas';
        opt.textContent = 'Mengantar Kepala Dinas';
        permitTypeSelect.appendChild(opt);
      }
    }

    renderEmployeeDashboardWidgets();
    renderPersonalHistoryTimeline();
    renderEmployeePermits();
    initLeafletMaps();
    
    // Auto-fetch real GPS
    window.triggerGPSFetch();
  }
  
  showToast("Otentikasi Berhasil", `Selamat datang kembali, ${user.name}!`, "success");
}

function handleLogout() {
  stopWebcam();
  
  // Clear states
  state.currentUser = null;
  state.biometricVerified = false;
  
  // Remove Navbar Badge
  DOM.userProfileBadge.classList.add('hidden');
  
  // Views Routing
  DOM.viewKaryawan.classList.add('hidden');
  DOM.viewKaryawan.classList.remove('active');
  DOM.viewAdmin.classList.add('hidden');
  DOM.viewAdmin.classList.remove('active');
  
  DOM.viewLogin.classList.remove('hidden');
  DOM.viewLogin.classList.add('active');
  
  // Reset maps references to reload cleanly later
  state.leafletMaps.employee = null;
  state.leafletMaps.admin = null;
  
  showToast("Sesi Berakhir", "Anda telah keluar dengan aman dari sistem.", "info");
}

// --- 14. EVENT LISTENERS SETUP ---
function setupEventListeners() {
  // Login Password visible toggle
  DOM.togglePassword.addEventListener('click', () => {
    const isPwd = DOM.loginPassword.type === 'password';
    DOM.loginPassword.type = isPwd ? 'text' : 'password';
    DOM.togglePassword.innerHTML = `<i class="fa-regular ${isPwd ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  });

  
  DOM.loginForm.addEventListener('submit', handleLoginSubmit);
  DOM.btnLogout.addEventListener('click', handleLogout);
  
  // Camera activation triggers
  DOM.btnActivateCamera.addEventListener('click', activateWebcam);
  DOM.btnActionCheckin.addEventListener('click', () => handleAttendanceCheck('in'));
  DOM.btnActionCheckout.addEventListener('click', () => handleAttendanceCheck('out'));
  
  // Journal text count & form submit
  DOM.journalText.addEventListener('input', () => {
    const len = DOM.journalText.value.length;
    DOM.journalCharCount.textContent = `${len} / 1000 Karakter`;
  });
  DOM.journalForm.addEventListener('submit', handleJournalSubmit);

  // --- Journal Checkout Modal ---
  if (DOM.journalCheckoutText) {
    DOM.journalCheckoutText.addEventListener('input', () => {
      const len = DOM.journalCheckoutText.value.length;
      DOM.journalCheckoutCharCount.textContent = `${len} / 1000 Karakter`;
      DOM.journalCheckoutCharCount.style.color = len >= 20 ? 'var(--success)' : 'var(--text-tertiary)';
      // Highlight textarea border when valid
      DOM.journalCheckoutText.style.borderColor = len >= 20 ? 'var(--success)' : 'var(--glass-border)';
    });
  }

  if (DOM.btnCancelJournalCheckout) {
    DOM.btnCancelJournalCheckout.addEventListener('click', () => {
      DOM.modalJournalCheckout.classList.add('hidden');
    });
  }

  if (DOM.formJournalCheckout) {
    DOM.formJournalCheckout.addEventListener('submit', async (e) => {
      e.preventDefault();
      const journalText = DOM.journalCheckoutText.value.trim();

      if (journalText.length < 20) {
        showToast("Jurnal Terlalu Singkat", "Mohon isi laporan aktivitas minimal 20 karakter agar laporan Anda tercatat dengan baik.", "error");
        DOM.journalCheckoutText.style.borderColor = 'var(--error)';
        DOM.journalCheckoutText.focus();
        return;
      }

      // Save journal first
      db.saveTodayJournal(state.currentUser.id, journalText);
      DOM.modalJournalCheckout.classList.add('hidden');

      // Now proceed with the actual checkout
      await handleAttendanceCheck('_out_confirmed');
    });
  }


  // Admin search & filters
  DOM.adminTableSearch.addEventListener('input', renderAdminTable);
  DOM.adminTableFilterStatus.addEventListener('change', renderAdminTable);
  
  if (DOM.adminTableFilterDate) {
    DOM.adminTableFilterDate.addEventListener('change', (e) => {
      if (e.target.value === 'custom_range') {
        DOM.dateRangeInputs.classList.remove('hidden');
      } else {
        DOM.dateRangeInputs.classList.add('hidden');
      }
      renderAdminDashboardKPIs();
      renderAdminRekapJabatan();
      renderAdminTable();
      plotAdminMapRecords();
      renderAdminCharts();
    });
  }
  
  if (DOM.filterDateStart) {
    DOM.filterDateStart.addEventListener('change', () => {
      renderAdminDashboardKPIs();
      renderAdminRekapJabatan();
      renderAdminTable();
      plotAdminMapRecords();
      renderAdminCharts();
    });
  }
  
  if (DOM.filterDateEnd) {
    DOM.filterDateEnd.addEventListener('change', () => {
      renderAdminDashboardKPIs();
      renderAdminRekapJabatan();
      renderAdminTable();
      plotAdminMapRecords();
      renderAdminCharts();
    });
  }
  
  if (DOM.rekapBulan) DOM.rekapBulan.addEventListener('change', renderAdminRekapBulanan);
  if (DOM.rekapTahun) DOM.rekapTahun.addEventListener('change', renderAdminRekapBulanan);
  if (DOM.btnCetakRekapBulanan) DOM.btnCetakRekapBulanan.addEventListener('click', window.exportRekapBulanan);

  // Rekap Jurnal Bulanan listeners
  populateRekapJurnalKaryawanDropdown();
  const btnFilterRJ = document.getElementById('btn-filter-rekap-jurnal');
  const btnCetakRJ  = document.getElementById('btn-cetak-rekap-jurnal');
  if (btnFilterRJ) btnFilterRJ.addEventListener('click', renderRekapJurnalBulanan);
  if (btnCetakRJ)  btnCetakRJ.addEventListener('click', exportRekapJurnalPDF);


  DOM.btnAdminRefresh.addEventListener('click', async () => {
    // Show loading state on button
    const originalHTML = DOM.btnAdminRefresh.innerHTML;
    DOM.btnAdminRefresh.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat...';
    DOM.btnAdminRefresh.disabled = true;

    try {
      // Pull fresh data from Neon DB
      await db.syncFromBackend();

      // Re-render all admin panels with latest data
      renderAdminDashboardKPIs();
      renderAdminRekapJabatan();
      renderAdminEmployees();
      renderAdminSupervisors();
      renderAdminPermits();
      renderAdminTable();
      renderAdminCharts();
      renderAdminRekapBulanan();
      populateRekapJurnalKaryawanDropdown();

      // Reset and re-render admin map with fresh data
      if (state.leafletMaps.admin) {
        state.leafletMaps.admin.remove();
        state.leafletMaps.admin = null;
        state.leafletMaps.adminMarkers = [];
        const adminMapContainer = document.getElementById('admin-attendance-map');
        if (adminMapContainer) {
          const newMap = adminMapContainer.cloneNode(false);
          adminMapContainer.parentNode.replaceChild(newMap, adminMapContainer);
        }
        initLeafletMaps();
      } else {
        plotAdminMapRecords();
      }

      showToast("Data Diperbarui", "Seluruh data kehadiran terbaru berhasil dimuat dari server.", "success");
    } catch (err) {
      console.error("Refresh error:", err);
      showToast("Gagal Memuat", "Terjadi kesalahan saat mengambil data dari server.", "error");
    } finally {
      // Restore button
      DOM.btnAdminRefresh.innerHTML = originalHTML;
      DOM.btnAdminRefresh.disabled = false;
    }
  });
  DOM.btnAdminExport.addEventListener('click', exportAttendanceToCSV);
  
  // Modals closing events
  DOM.btnCloseJournalModal.addEventListener('click', () => DOM.modalJournalViewer.classList.add('hidden'));
  DOM.btnDismissJournalModal.addEventListener('click', () => DOM.modalJournalViewer.classList.add('hidden'));
  DOM.btnVerifyJournal.addEventListener('click', () => {
    DOM.modalJournalViewer.classList.add('hidden');
    showToast("Verifikasi Berhasil", "Jurnal pekerjaan karyawan telah disetujui.", "success");
  });
  
  DOM.btnClosePhotoModal.addEventListener('click', () => DOM.modalPhotoViewer.classList.add('hidden'));
  DOM.btnDismissPhotoModal.addEventListener('click', () => DOM.modalPhotoViewer.classList.add('hidden'));
  
  // Employee Management Events
  let addEmpStream = null;
  if (DOM.btnAddEmployeeModal) {
    DOM.btnAddEmployeeModal.addEventListener('click', () => {
      DOM.modalAddEmployee.classList.remove('hidden');
      DOM.addEmpPhotoPreview.src = "https://via.placeholder.com/100?text=Wajah";
      DOM.addEmpPhotoData.value = "";
      DOM.addEmpWebcam.style.display = "none";
      DOM.addEmpPhotoPreview.style.display = "block";
      DOM.btnAddEmpCamera.style.display = "inline-block";
      DOM.btnAddEmpCapture.style.display = "none";
      DOM.btnAddEmpCamera.innerHTML = '<i class="fa-solid fa-camera"></i> Nyalakan Kamera';
      // Reset role dropdown & show jabatan/shift
      if (DOM.addEmpAccountRole) DOM.addEmpAccountRole.value = 'karyawan';
      toggleAddEmpRoleFields('karyawan');
    });
  }

  const btnAddSupervisorModal = document.getElementById('btn-add-supervisor-modal');
  if (btnAddSupervisorModal) {
    btnAddSupervisorModal.addEventListener('click', () => {
      DOM.modalAddEmployee.classList.remove('hidden');
      DOM.addEmpPhotoPreview.src = "https://via.placeholder.com/100?text=Wajah";
      DOM.addEmpPhotoData.value = "";
      DOM.addEmpWebcam.style.display = "none";
      DOM.addEmpPhotoPreview.style.display = "block";
      DOM.btnAddEmpCamera.style.display = "inline-block";
      DOM.btnAddEmpCapture.style.display = "none";
      DOM.btnAddEmpCamera.innerHTML = '<i class="fa-solid fa-camera"></i> Nyalakan Kamera';
      // Reset role dropdown to \'pengawas\' & hide jabatan/shift
      if (DOM.addEmpAccountRole) DOM.addEmpAccountRole.value = 'pengawas';
      toggleAddEmpRoleFields('pengawas');
    });
  }

  // Toggle jabatan/shift visibility when Akses Akun changes
  function toggleAddEmpRoleFields(role) {
    const jabatanGroup = document.getElementById('add-emp-jabatan-group');
    const shiftGroup   = document.getElementById('add-emp-shift-group');
    const isKaryawan = role === 'karyawan';
    if (jabatanGroup) jabatanGroup.style.display = isKaryawan ? '' : 'none';
    if (shiftGroup)   shiftGroup.style.display   = isKaryawan ? '' : 'none';
  }
  if (DOM.addEmpAccountRole) {
    DOM.addEmpAccountRole.addEventListener('change', (e) => toggleAddEmpRoleFields(e.target.value));
  }

  if (DOM.btnCloseAddEmployeeModal) {
    DOM.btnCloseAddEmployeeModal.addEventListener('click', () => {
      DOM.modalAddEmployee.classList.add('hidden');
      if (addEmpStream) {
        addEmpStream.getTracks().forEach(track => track.stop());
        addEmpStream = null;
      }
    });
  }
  if (DOM.btnAddEmpCamera) {
    DOM.btnAddEmpCamera.addEventListener('click', () => {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then(stream => {
          addEmpStream = stream;
          DOM.addEmpWebcam.srcObject = stream;
          DOM.addEmpWebcam.style.display = 'block';
          DOM.addEmpPhotoPreview.style.display = 'none';
          DOM.btnAddEmpCamera.style.display = 'none';
          DOM.btnAddEmpCapture.style.display = 'inline-block';
        })
        .catch(err => {
          showToast("Kamera Gagal", "Tidak dapat mengakses kamera untuk rekam wajah.", "error");
        });
    });
  }
  if (DOM.btnAddEmpCapture) {
    DOM.btnAddEmpCapture.addEventListener('click', async () => {
      if (!addEmpStream) return;
      const ctx = DOM.addEmpCanvas.getContext('2d');
      ctx.drawImage(DOM.addEmpWebcam, 0, 0, 300, 300);
      const dataUrl = DOM.addEmpCanvas.toDataURL('image/jpeg', 0.8);
      
      const resetWebcamUI = () => {
        addEmpStream.getTracks().forEach(track => track.stop());
        addEmpStream = null;
        DOM.addEmpWebcam.style.display = 'none';
        DOM.addEmpPhotoPreview.style.display = 'block';
        DOM.btnAddEmpCapture.style.display = 'none';
        DOM.btnAddEmpCamera.style.display = 'inline-block';
        DOM.btnAddEmpCamera.innerHTML = '<i class="fa-solid fa-camera"></i> Ulangi Foto';
      };

      if (faceApiLoaded) {
          DOM.btnAddEmpCapture.disabled = true;
          DOM.btnAddEmpCapture.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menganalisa Wajah...';
          
          const img = new Image();
          img.src = dataUrl;
          await new Promise(r => img.onload = r);
          
          const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
          
          DOM.btnAddEmpCapture.disabled = false;
          
          if (!detection) {
              showToast("Wajah Tidak Terdeteksi", "Sistem gagal mendeteksi wajah di foto. Coba foto ulang dengan cahaya yang lebih terang.", "error");
              DOM.btnAddEmpCapture.innerHTML = '<i class="fa-solid fa-camera-retro"></i> Potret Wajah';
              return;
          }
          
          DOM.addEmpPhotoData.setAttribute('data-descriptor', JSON.stringify(Array.from(detection.descriptor)));
          DOM.addEmpPhotoData.value = dataUrl;
          DOM.addEmpPhotoPreview.src = dataUrl;
          resetWebcamUI();
          showToast("Biometrik Disimpan", "Sidik wajah berhasil diekstrak dan disimpan.", "success");
      } else {
          DOM.addEmpPhotoData.value = dataUrl;
          DOM.addEmpPhotoPreview.src = dataUrl;
          resetWebcamUI();
      }
    });
  }
  if (DOM.formAddEmployee) {
    DOM.formAddEmployee.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = DOM.addEmpName.value.trim();
      const email = DOM.addEmpEmail.value.trim();
      const password = DOM.addEmpPassword.value;
      const accountRole = DOM.addEmpAccountRole ? DOM.addEmpAccountRole.value : "karyawan";
      const isKaryawan = accountRole === 'karyawan';
      const roleText = isKaryawan ? (DOM.addEmpRole.value.trim()) : '';
      const shiftVal = isKaryawan ? (DOM.addEmpShift ? DOM.addEmpShift.value : "siang") : null;

      // Validate jabatan only for karyawan
      if (isKaryawan && !roleText) {
        showToast('Jabatan Wajib Diisi', 'Pilih jabatan/posisi untuk pegawai outsourcing.', 'error');
        return;
      }
      const photoData = DOM.addEmpPhotoData.value || "https://via.placeholder.com/150";
      const descriptorData = DOM.addEmpPhotoData.getAttribute('data-descriptor');
      
      const newEmp = {
        id: "u-" + Date.now(),
        name: name,
        email: email,
        password: password,
        role: accountRole,
        shift: shiftVal,
        avatar: name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase(),
        position: roleText,
        photo: photoData,
        faceDescriptor: descriptorData ? JSON.parse(descriptorData) : null
      };
      
      db.users.push(newEmp);
      db.save();
      
      DOM.modalAddEmployee.classList.add('hidden');
      DOM.formAddEmployee.reset();
      DOM.addEmpPhotoData.removeAttribute('data-descriptor');
      
      renderAdminEmployees();
      renderAdminSupervisors();
      renderAdminDashboardKPIs();
      renderAdminRekapJabatan();
      renderAdminRekapBulanan();
      populateRekapJurnalKaryawanDropdown();
      showToast("Pegawai Ditambahkan", "Pegawai baru berhasil didaftarkan.", "success");
    });
  }
  
  // Add Calendar Event Listeners
  if (DOM.btnAddCalendarModal) {
    DOM.btnAddCalendarModal.addEventListener('click', () => DOM.modalAddCalendar.classList.remove('hidden'));
  }
  if (DOM.btnCloseCalendarModal) {
    DOM.btnCloseCalendarModal.addEventListener('click', () => DOM.modalAddCalendar.classList.add('hidden'));
  }
  if (DOM.formAddCalendar) {
    DOM.formAddCalendar.addEventListener('submit', (e) => {
      e.preventDefault();
      const date = DOM.addCalDate.value;
      const title = DOM.addCalTitle.value.trim();
      const type = DOM.addCalType.value;
      
      db.calendars.push({
        id: "cal-" + Date.now(),
        date: date,
        title: title,
        type: type
      });
      db.save();
      
      DOM.modalAddCalendar.classList.add('hidden');
      DOM.formAddCalendar.reset();
      
      renderAdminCalendars();
      renderAdminRekapBulanan();
      showToast("Kalender Disimpan", "Hari libur / cuti bersama berhasil ditambahkan.", "success");
    });
  }
  
  // Admin Update GPS
  if (DOM.btnUpdateOfficeGps) {
    DOM.btnUpdateOfficeGps.addEventListener('click', () => {
      const lat = parseFloat(DOM.adminOfficeLat.value);
      const lng = parseFloat(DOM.adminOfficeLng.value);
      if (!isNaN(lat) && !isNaN(lng)) {
        OFFICE_LAT = lat;
        OFFICE_LNG = lng;
        localStorage.setItem("admin_office_lat", lat);
        localStorage.setItem("admin_office_lng", lng);
        
        // Sync to backend settings database
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ office_lat: lat, office_lng: lng })
        }).catch(err => console.error("Failed to sync office GPS settings:", err));
        
        state.currentLat = lat;
        state.currentLng = lng;
        
        // Refresh Maps
        state.leafletMaps.employee = null;
        state.leafletMaps.admin = null;
        const employeeMapContainer = document.getElementById('employee-attendance-map');
        const adminMapContainer = document.getElementById('admin-attendance-map');
        if (employeeMapContainer) {
            const newMap = employeeMapContainer.cloneNode(false);
            employeeMapContainer.parentNode.replaceChild(newMap, employeeMapContainer);
        }
        if (adminMapContainer) {
            const newMap = adminMapContainer.cloneNode(false);
            adminMapContainer.parentNode.replaceChild(newMap, adminMapContainer);
        }
        
        // Re-init map variables
        DOM.employeeAttendanceMap = document.getElementById('employee-attendance-map');
        DOM.adminAttendanceMap = document.getElementById('admin-attendance-map');
        
        initLeafletMaps();
        if (state.currentUser && state.currentUser.role === 'admin') {
            plotAdminMapRecords();
        }
        
        showToast("GPS Diperbarui", "Pusat koordinat kantor Disdukcapil berhasil diubah.", "success");
      } else {
        showToast("Koordinat Salah", "Silakan masukkan Latitude dan Longitude yang valid.", "error");
      }
    });
  }
  
  // Admin Update Shift Config
  if (DOM.btnSaveShiftConfig) {
    DOM.btnSaveShiftConfig.addEventListener('click', () => {
      SHIFT_CONFIG.siang.in = DOM.adminShiftSiangIn.value || "08:00";
      SHIFT_CONFIG.siang.out = DOM.adminShiftSiangOut.value || "15:30";
      SHIFT_CONFIG.malam.in = DOM.adminShiftMalamIn.value || "20:00";
      SHIFT_CONFIG.malam.out = DOM.adminShiftMalamOut.value || "04:00";
      
      localStorage.setItem("admin_shift_config", JSON.stringify(SHIFT_CONFIG));
      
      // Sync to backend settings database
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_config: SHIFT_CONFIG })
      }).catch(err => console.error("Failed to sync shift config settings:", err));
      
      showToast("Shift Disimpan", "Pengaturan jam kerja untuk Shift Siang & Malam berhasil diperbarui.", "success");
    });
  }

  // Permits & Leaves UI Handlers
  const permitTypeSelect = document.getElementById('permit-type');
  const doctorLetterGroup = document.getElementById('doctor-letter-group');
  if (permitTypeSelect && doctorLetterGroup) {
    permitTypeSelect.addEventListener('change', (e) => {
      doctorLetterGroup.style.display = e.target.value === 'sakit' ? 'block' : 'none';
    });
  }

  const formSubmitPermit = document.getElementById('form-submit-permit');
  if (formSubmitPermit) {
    formSubmitPermit.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const type = document.getElementById('permit-type').value;
      const startVal = document.getElementById('permit-start-date').value;
      const endVal = document.getElementById('permit-end-date').value;
      const reason = document.getElementById('permit-reason').value.trim();
      const docLetter = document.getElementById('doctor-letter-number').value.trim();
      
      if (!startVal || !endVal) {
        showToast("Tanggal Kosong", "Silakan tentukan Tanggal Mulai dan Selesai.", "error");
        return;
      }
      
      const start = new Date(startVal);
      const end = new Date(endVal);
      if (end < start) {
        showToast("Tanggal Salah", "Tanggal Selesai tidak boleh mendahului Tanggal Mulai.", "error");
        return;
      }
      
      const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      // Validation 1: Izin tidak masuk kerja max 1 hari
      if (type === 'izin' && days > 1) {
        showToast("Izin Maksimal 1 Hari", "Pengajuan izin hanya berlaku untuk 1 hari kerja. Silakan isi form pengajuan cuti jika lebih dari 1 hari.", "error");
        return;
      }
      
      // Validation 2: Sakit > 1 hari must have medical certificate number
      if (type === 'sakit' && days > 1 && !docLetter) {
        showToast("Nomor SKD Wajib", "Untuk pengajuan sakit lebih dari 1 hari, Anda wajib mengisi nomor surat keterangan sakit dokter.", "error");
        return;
      }
      
      // Validation 3: Kuota Cuti Tahunan maksimal 12 hari kerja
      if (type === 'cuti') {
        const currentYear = new Date().getFullYear();
        const usedLeaveDays = db.permits
          .filter(p => p.user_id === state.currentUser.id && p.permit_type === 'cuti' && p.status !== 'rejected')
          .reduce((total, p) => {
            const pYear = new Date(p.start_date).getFullYear();
            if (pYear === currentYear) {
              const s = new Date(p.start_date);
              const e = new Date(p.end_date);
              return total + Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
            }
            return total;
          }, 0);
        
        if (usedLeaveDays + days > 12) {
          const remaining = Math.max(0, 12 - usedLeaveDays);
          showToast("Kuota Cuti Habis", `Sisa kuota cuti tahunan Anda: ${remaining} hari. Anda mengajukan ${days} hari yang melebihi batas 12 hari/tahun.`, "error");
          return;
        }
      }
      
      const newPermit = {
        id: 'pm-' + Date.now(),
        user_id: state.currentUser.id,
        permit_type: type,
        start_date: startVal,
        end_date: endVal,
        reason: reason,
        doctor_letter_number: docLetter || null,
        status: 'pending',
        approved_by: null,
        approved_at: null,
        leave_letter_number: null
      };
      
      db.permits.push(newPermit);
      await db.save();
      
      formSubmitPermit.reset();
      if (doctorLetterGroup) doctorLetterGroup.style.display = 'none';
      renderEmployeePermits();
      showToast("Pengajuan Dikirim", "Pengajuan izin/cuti berhasil dikirim dan menunggu persetujuan.", "success");
    });
  }
  
  // Verification Portal Events
  if (DOM.btnBackToLogin) {
    DOM.btnBackToLogin.addEventListener('click', () => window.hideVerificationPortal());
  }
}

// Global functions for Permits
function renderEmployeePermits() {
  const tbody = document.getElementById('employee-permits-table-body');
  if (!tbody || !state.currentUser) return;
  
  const myPermits = db.permits.filter(p => p.user_id === state.currentUser.id);
  tbody.innerHTML = '';
  
  myPermits.forEach(p => {
    const start = new Date(p.start_date);
    const end = new Date(p.end_date);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    let badgeClass = p.status === 'approved' ? 'hadir' : (p.status === 'rejected' ? 'verif-failed' : 'terlambat');
    let statusLabel = p.status === 'approved' ? 'Disetujui' : (p.status === 'rejected' ? 'Ditolak' : 'Menunggu');
    
    let info = p.reason;
    if (p.permit_type === 'sakit' && p.doctor_letter_number) {
      info += `<br><span style="font-size:0.75rem; color:var(--text-tertiary);"><i class="fa-solid fa-file-medical"></i> SKD: ${p.doctor_letter_number}</span>`;
    }
    
    let pdfBtn = '-';
    if (p.permit_type === 'cuti' && p.status === 'approved') {
      pdfBtn = `<button class="btn btn-secondary btn-sm" onclick="downloadLeavePDF('${p.id}')" style="padding: 4px 8px; font-size: 0.75rem; background: var(--violet); border-color: var(--violet); color: white;"><i class="fa-solid fa-file-pdf"></i> Surat Cuti</button>`;
    } else if (p.permit_type === 'mengantar_kepala_dinas' && p.status === 'approved') {
      pdfBtn = `<button class="btn btn-secondary btn-sm" onclick="downloadTravelPDF('${p.id}')" style="padding: 4px 8px; font-size: 0.75rem; background: var(--accent); border-color: var(--accent); color: white;"><i class="fa-solid fa-file-invoice"></i> Surat Jalan</button>`;
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-transform: capitalize; font-weight:600;">${p.permit_type.replace(/_/g, ' ')}</td>
      <td>${formatIndoDate(p.start_date)} s/d ${formatIndoDate(p.end_date)}</td>
      <td>${days} Hari</td>
      <td>${info}</td>
      <td><span class="status-tag ${badgeClass}">${statusLabel}</span></td>
      <td style="text-align: center;">${pdfBtn}</td>
    `;
    tbody.appendChild(tr);
  });
  
  if (myPermits.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 20px; color: var(--text-secondary);">Belum ada riwayat pengajuan.</td></tr>';
  }
}

function renderAdminPermits() {
  const tbody = document.getElementById('admin-permits-table-body');
  if (!tbody) return;
  
  const permits = db.permits || [];
  tbody.innerHTML = '';
  
  // Sort permits by start_date descending
  permits.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  
  permits.forEach(p => {
    const emp = db.users.find(u => u.id === p.user_id);
    const empName = emp ? emp.name : (p.name || 'N/A');
    const empPos = emp ? emp.position : (p.position || 'N/A');
    const empAvatar = emp ? emp.avatar : (p.name ? p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?');
    
    const start = new Date(p.start_date);
    const end = new Date(p.end_date);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    let info = p.reason;
    if (p.permit_type === 'sakit' && p.doctor_letter_number) {
      info += `<br><span style="font-size:0.75rem; color:var(--error);"><i class="fa-solid fa-file-medical"></i> SKD: ${p.doctor_letter_number}</span>`;
    }
    
    let statusLabel = '';
    let badgeClass = '';
    if (p.status === 'approved') {
      statusLabel = 'Disetujui';
      badgeClass = 'hadir';
    } else if (p.status === 'rejected') {
      statusLabel = 'Ditolak';
      badgeClass = 'verif-failed';
    } else {
      statusLabel = 'Menunggu';
      badgeClass = 'terlambat';
    }
    
    let deleteBtnHtml = '';
    if (state.currentUser && state.currentUser.role === 'admin') {
      deleteBtnHtml = `<button class="btn btn-danger btn-sm" onclick="deletePermit('${p.id}')" style="padding: 4px 8px; font-size: 0.75rem; background: var(--error); border-color: var(--error); color: white; margin-left: 6px;" title="Hapus Pengajuan"><i class="fa-solid fa-trash"></i></button>`;
    }
    
    let actionHtml = '';
    if (p.status === 'pending') {
      actionHtml = `
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="btn btn-success btn-sm" onclick="approvePermit('${p.id}')" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-check"></i> Setuju</button>
          <button class="btn btn-danger btn-sm" onclick="rejectPermit('${p.id}')" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-xmark"></i> Tolak</button>
          ${deleteBtnHtml}
        </div>
      `;
    } else if (p.permit_type === 'cuti' && p.status === 'approved') {
      actionHtml = `
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="btn btn-secondary btn-sm" onclick="downloadLeavePDF('${p.id}')" style="padding: 4px 8px; font-size: 0.75rem; background: var(--violet); border-color: var(--violet); color: white;"><i class="fa-solid fa-file-pdf"></i> Surat Cuti</button>
          ${deleteBtnHtml}
        </div>
      `;
    } else if (p.permit_type === 'mengantar_kepala_dinas' && p.status === 'approved') {
      actionHtml = `
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="btn btn-secondary btn-sm" onclick="downloadTravelPDF('${p.id}')" style="padding: 4px 8px; font-size: 0.75rem; background: var(--accent); border-color: var(--accent); color: white;"><i class="fa-solid fa-file-invoice"></i> Surat Jalan</button>
          ${deleteBtnHtml}
        </div>
      `;
    } else {
      actionHtml = `
        <div style="display:flex; gap:6px; align-items:center; justify-content:space-between; width:100%;">
          <span style="font-size:0.8rem; color:var(--text-tertiary);">${p.approved_by || '-'}</span>
          ${deleteBtnHtml}
        </div>
      `;
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="cell-employee">
          <div class="user-avatar" style="width: 28px; height: 28px; font-size: 0.7rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--accent); color: white;">${empAvatar}</div>
          <div class="cell-meta">
            <span class="cell-name">${empName}</span>
            <span class="cell-role" style="font-size:0.72rem;">${empPos}</span>
          </div>
        </div>
      </td>
      <td style="text-transform: capitalize; font-weight:600;">${p.permit_type.replace(/_/g, ' ')}</td>
      <td>${formatIndoDate(p.start_date)}</td>
      <td>${formatIndoDate(p.end_date)}</td>
      <td>${days} Hari</td>
      <td>${info}</td>
      <td><span class="status-tag ${badgeClass}">${statusLabel}</span></td>
      <td>${actionHtml}</td>
    `;
    tbody.appendChild(tr);
  });
  
  if (permits.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 20px; color: var(--text-secondary);">Tidak ada pengajuan izin/cuti.</td></tr>';
  }
}

window.approvePermit = function(id) {
  const permit = db.permits.find(p => p.id === id);
  if (!permit) return;
  
  // For cuti, require leave letter number
  if (permit.permit_type === 'cuti') {
    const letterNumber = prompt('Masukkan Nomor Surat Cuti (wajib diisi):\n\nContoh: 800/123/Disdukcapil/2026');
    if (!letterNumber || !letterNumber.trim()) {
      showToast("Nomor Surat Wajib", "Nomor surat cuti wajib diisi untuk menyetujui pengajuan cuti.", "error");
      return;
    }
    permit.leave_letter_number = letterNumber.trim();
  } else if (permit.permit_type === 'mengantar_kepala_dinas') {
    const letterNumber = prompt('Masukkan Nomor Surat Jalan (wajib diisi):\n\nContoh: 094/123/Disdukcapil/2026');
    if (!letterNumber || !letterNumber.trim()) {
      showToast("Nomor Surat Wajib", "Nomor surat jalan wajib diisi untuk menyetujui pengajuan mengantar kepala dinas.", "error");
      return;
    }
    permit.leave_letter_number = letterNumber.trim();
  } else {
    if (!confirm('Apakah Anda yakin ingin menyetujui pengajuan ini?')) return;
  }
  
  permit.status = 'approved';
  permit.approved_by = state.currentUser ? state.currentUser.name : 'System';
  permit.approved_at = new Date().toISOString();
  
  // Generate attendances for each date using timezone-safe helper
  const dates = getDatesInRange(permit.start_date, permit.end_date);
  const user = db.users.find(u => u.id === permit.user_id);
  
  const statusMap = {
    'izin': 'Izin',
    'sakit': 'Sakit',
    'cuti': 'Cuti',
    'mengantar_kepala_dinas': 'Mengantar Kepala Dinas'
  };
  const attendanceStatus = statusMap[permit.permit_type] || 'Izin';
  
  dates.forEach(dateStr => {
    // Check if attendance already exists
    const exists = db.attendances.some(a => a.user_id === permit.user_id && a.date === dateStr);
    if (!exists) {
      const attId = `att-permit-${dateStr}-${permit.user_id}`;
      const newAtt = {
        id: attId,
        user_id: permit.user_id,
        date: dateStr,
        check_in_time: dateStr + 'T08:00:00+07:00',
        check_out_time: dateStr + 'T16:00:00+07:00',
        photo_url: null,
        latitude_longitude: '-',
        distance: 0,
        face_match: 100,
        status: attendanceStatus
      };
      db.attendances.push(newAtt);
    }
  });
  
  db.save();
  renderAdminPermits();
  renderAdminTable();
  renderAdminDashboardKPIs();
  renderAdminRekapJabatan();
  renderAdminRekapBulanan();
  showToast("Pengajuan Disetujui", `Pengajuan ${permit.permit_type.replace(/_/g, ' ')} untuk ${user ? user.name : 'Pegawai'} berhasil disetujui.`, "success");
};

window.rejectPermit = function(id) {
  if (!confirm('Apakah Anda yakin ingin menolak pengajuan ini?')) return;
  const permit = db.permits.find(p => p.id === id);
  if (!permit) return;
  
  permit.status = 'rejected';
  permit.approved_by = state.currentUser ? state.currentUser.name : 'System';
  permit.approved_at = new Date().toISOString();
  
  db.save();
  renderAdminPermits();
  showToast("Pengajuan Ditolak", `Pengajuan ${permit.permit_type} telah ditolak.`, "info");
};

window.deletePermit = async function(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus pengajuan izin/cuti ini? Seluruh data pengajuan dan log absensi terkait akan dihapus permanen.')) return;
  const permit = db.permits.find(p => p.id === id);
  if (!permit) return;
  
  // Clean up generated attendances
  const dates = getDatesInRange(permit.start_date, permit.end_date);
  db.attendances = db.attendances.filter(a => {
    // Check if ID matches
    const matchesId = dates.some(dateStr => a.id === `att-permit-${dateStr}-${permit.user_id}`);
    if (matchesId) return false;
    
    // Fallback: check user, date range, and status
    if (a.user_id === permit.user_id && a.date >= permit.start_date && a.date <= permit.end_date) {
      if (['Izin', 'Sakit', 'Cuti', 'Mengantar Kepala Dinas'].includes(a.status)) {
        return false;
      }
    }
    return true;
  });
  
  // Remove permit
  db.permits = db.permits.filter(p => p.id !== id);
  
  await db.save();
  renderAdminPermits();
  renderAdminTable();
  renderAdminDashboardKPIs();
  renderAdminRekapJabatan();
  renderAdminRekapBulanan();
  showToast("Pengajuan Dihapus", `Pengajuan ${permit.permit_type.replace(/_/g, ' ')} berhasil dihapus.`, "info");
};

window.showVerificationPortal = function(verifyId) {
  // Hide login view, show verification view
  if (DOM.viewLogin) {
    DOM.viewLogin.classList.remove('active');
    DOM.viewLogin.classList.add('hidden');
  }
  if (DOM.viewKaryawan) {
    DOM.viewKaryawan.classList.remove('active');
    DOM.viewKaryawan.classList.add('hidden');
  }
  if (DOM.viewAdmin) {
    DOM.viewAdmin.classList.remove('active');
    DOM.viewAdmin.classList.add('hidden');
  }
  if (DOM.viewVerifikasi) {
    DOM.viewVerifikasi.classList.remove('hidden');
    DOM.viewVerifikasi.classList.add('active');
  }

  const detailContainer = DOM.verificationDetailContainer;
  if (!detailContainer) return;

  detailContainer.classList.remove('hidden');

  if (verifyId) {
    // Look up permit
    const permit = db.permits.find(p => p.id === verifyId);
    
    if (permit && permit.status === 'approved') {
      const emp = db.users.find(u => u.id === permit.user_id);
      const empName = emp ? emp.name : 'N/A';
      const empPos = emp ? emp.position : 'N/A';
      const docType = permit.permit_type === 'mengantar_kepala_dinas' ? 'Surat Jalan (Mengantar Kepala Dinas)' : 'Surat Izin Cuti';
      const docNo = permit.leave_letter_number || '-';
      const startStr = formatIndoDate(permit.start_date);
      const endStr = formatIndoDate(permit.end_date);
      
      detailContainer.style.borderColor = 'var(--success)';
      detailContainer.style.background = 'rgba(34,197,94,0.08)';
      detailContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Header: Icon & Big status title -->
          <div style="display: flex; align-items: center; gap: 14px; border-bottom: 1px solid rgba(34,197,94,0.15); padding-bottom: 16px;">
            <div style="background: var(--success); color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 0 15px rgba(34,197,94,0.4);">
              <i class="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <h3 style="color: var(--success); margin: 0; font-size: 1.25rem; font-weight: 700; letter-spacing: 0.5px;">
                Dokumen Terverifikasi & Asli
              </h3>
              <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: var(--text-tertiary);">Status: Valid (Terdaftar di Database Disdukcapil)</p>
            </div>
          </div>

          <!-- Key Value Items List -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <!-- Nomor Dokumen -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px 14px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Nomor Dokumen</span>
              <span style="color: var(--text-primary); font-weight: 600; font-size: 1.05rem; word-break: break-all;">${docNo}</span>
            </div>

            <!-- Jenis Dokumen -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px 14px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Jenis Dokumen</span>
              <span style="color: var(--text-primary); font-weight: 600; font-size: 1rem;">${docType}</span>
            </div>

            <!-- Nama Pegawai -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px 14px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Nama Pegawai</span>
              <span style="color: var(--text-primary); font-weight: 600; font-size: 1rem;">${empName}</span>
            </div>

            <!-- Jabatan / Posisi -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px 14px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Jabatan / Posisi</span>
              <span style="color: var(--text-primary); font-weight: 600; font-size: 1rem;">${empPos}</span>
            </div>

            <!-- Tanggal Berlaku -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px 14px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Tanggal Berlaku</span>
              <span style="color: var(--text-primary); font-weight: 600; font-size: 1rem;">${startStr} s/d ${endStr}</span>
            </div>

            <!-- Verifikator -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px 14px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Diverifikasi Oleh</span>
              <span style="color: var(--accent); font-weight: 600; font-size: 1rem; font-style: italic;">${permit.approved_by || 'Admin/Pengawas'}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      detailContainer.style.borderColor = 'var(--error)';
      detailContainer.style.background = 'rgba(239,68,68,0.08)';
      detailContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Header: Icon & Big status title -->
          <div style="display: flex; align-items: center; gap: 14px; border-bottom: 1px solid rgba(239,68,68,0.15); padding-bottom: 16px;">
            <div style="background: var(--error); color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 0 15px rgba(239,68,68,0.4);">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <h3 style="color: var(--error); margin: 0; font-size: 1.25rem; font-weight: 700; letter-spacing: 0.5px;">
                Dokumen Tidak Valid / Dihapus
              </h3>
              <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: var(--text-tertiary);">Status: Invalid (Tidak Terdaftar)</p>
            </div>
          </div>

          <!-- Warning Details -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 14px; border-radius: var(--radius-sm);">
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">
              Dokumen dengan ID <strong style="color: var(--error); word-break: break-all;">"${verifyId}"</strong> tidak valid, tidak terdaftar, atau sudah dihapus oleh Otoritas Dinas Kependudukan dan Pencatatan Sipil Kabupaten Murung Raya.
            </p>
          </div>
        </div>
      `;
    }
  } else {
    detailContainer.style.borderColor = 'var(--accent)';
    detailContainer.style.background = 'rgba(147, 51, 234, 0.05)';
    detailContainer.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 16px;">
        <div style="background: var(--accent); color: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
          <i class="fa-solid fa-qrcode"></i>
        </div>
        <div>
          <h3 style="color: var(--accent); margin: 0 0 4px 0; font-size: 1.2rem;">Silakan Scan QR Code</h3>
          <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
            Silakan scan QR Code yang tertera pada berkas cetak Surat Cuti atau Surat Jalan resmi untuk melihat data verifikasi keaslian dokumen secara langsung di sini.
          </p>
        </div>
      </div>
    `;
  }
};

window.hideVerificationPortal = function() {
  if (DOM.viewVerifikasi) {
    DOM.viewVerifikasi.classList.remove('active');
    DOM.viewVerifikasi.classList.add('hidden');
  }
  if (DOM.viewLogin) {
    DOM.viewLogin.classList.remove('hidden');
    DOM.viewLogin.classList.add('active');
  }
  
  // Clear verify query param from URL without reloading page
  const url = new URL(window.location);
  url.searchParams.delete('verify');
  window.history.replaceState({}, '', url);
};

window.downloadLeavePDF = function(permitId) {
  const permit = db.permits.find(p => p.id === permitId);
  if (!permit) {
    showToast("Error", "Data pengajuan tidak ditemukan.", "error");
    return;
  }
  
  if (!window.jspdf) {
    showToast("Error", "Library PDF belum termuat.", "error");
    return;
  }
  
  const emp = db.users.find(u => u.id === permit.user_id);
  const empName = emp ? emp.name : 'N/A';
  const empPos = emp ? emp.position : 'N/A';
  
  const start = new Date(permit.start_date);
  const end = new Date(permit.end_date);
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  
  const startStr = formatIndoDate(permit.start_date);
  const endStr = formatIndoDate(permit.end_date);
  const approvedDateStr = permit.approved_at ? formatIndoDate(permit.approved_at.split('T')[0]) : formatIndoDate(new Date().toISOString().split('T')[0]);
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // --- KOP SURAT with Logo ---
  const headerCenterX = 116;
  
  // Add logo if available
  if (LOGO_BASE64) {
    try {
      doc.addImage(LOGO_BASE64, 'PNG', 20, 8, 22, 25);
    } catch (e) {
      console.warn('Failed to add logo to PDF:', e);
    }
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PEMERINTAH KABUPATEN MURUNG RAYA", headerCenterX, 14, { align: "center" });
  doc.setFontSize(13);
  doc.text("DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL", headerCenterX, 20, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Jl. Bina Praja No. Puruk Cahu Kode Pos 73911", headerCenterX, 25, { align: "center" });
  
  // Segmented contact details line
  doc.setFontSize(8);
  
  doc.setFont("helvetica", "italic");
  const w1 = doc.getTextWidth("Telp. ");
  
  doc.setFont("helvetica", "normal");
  const w2 = doc.getTextWidth("(0828) 31813 ");
  
  doc.setFont("helvetica", "italic");
  const w3 = doc.getTextWidth("Fax. ");
  
  doc.setFont("helvetica", "normal");
  const w4 = doc.getTextWidth("(0528) 31814 ");
  
  doc.setFont("helvetica", "italic");
  const w5 = doc.getTextWidth("Email. ");
  
  doc.setFont("helvetica", "normal");
  const w6 = doc.getTextWidth("disdukcapil@murungrayakab.go.id");
  
  const totalWidth = w1 + w2 + w3 + w4 + w5 + w6;
  const contactStartX = headerCenterX - (totalWidth / 2);
  let currentX = contactStartX;
  const contactY = 30;
  
  doc.setFont("helvetica", "italic");
  doc.text("Telp. ", currentX, contactY);
  currentX += w1;
  
  doc.setFont("helvetica", "normal");
  doc.text("(0828) 31813 ", currentX, contactY);
  currentX += w2;
  
  doc.setFont("helvetica", "italic");
  doc.text("Fax. ", currentX, contactY);
  currentX += w3;
  
  doc.setFont("helvetica", "normal");
  doc.text("(0528) 31814 ", currentX, contactY);
  currentX += w4;
  
  doc.setFont("helvetica", "italic");
  doc.text("Email. ", currentX, contactY);
  currentX += w5;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 255);
  doc.text("disdukcapil@murungrayakab.go.id", currentX, contactY);
  
  // Draw underline for email
  doc.setDrawColor(0, 0, 255);
  doc.setLineWidth(0.1);
  doc.line(currentX, contactY + 0.5, currentX + w6, contactY + 0.5);
  
  // Reset colors and linewidth
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  
  // Double line separator
  doc.setLineWidth(0.8);
  doc.line(20, 34, 190, 34);
  doc.setLineWidth(0.25);
  doc.line(20, 35.5, 190, 35.5);
  
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("SURAT IZIN CUTI TAHUNAN", 105, 45, { align: "center" });
  
  // Reference number from approval (leave_letter_number)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const refNo = permit.leave_letter_number 
    ? 'Nomor: ' + permit.leave_letter_number
    : 'Nomor: -';
  doc.text(refNo, 105, 51, { align: "center" });
  
  // Underline title
  doc.setLineWidth(0.3);
  doc.line(70, 52, 140, 52);
  
  // Body opening
  let y = 62;
  doc.setFontSize(10);
  doc.text("Diberikan izin cuti tahunan kepada Pegawai Outsourcing berikut:", 20, y);
  
  // Employee details
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Nama", 30, y);
  doc.text(":", 72, y);
  doc.setFont("helvetica", "normal");
  doc.text(empName, 77, y);
  
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Jabatan/Posisi", 30, y);
  doc.text(":", 72, y);
  doc.setFont("helvetica", "normal");
  doc.text(empPos, 77, y);
  
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Unit Kerja", 30, y);
  doc.text(":", 72, y);
  doc.setFont("helvetica", "normal");
  doc.text("Disdukcapil Kabupaten Murung Raya", 77, y);
  
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Lama Cuti", 30, y);
  doc.text(":", 72, y);
  doc.setFont("helvetica", "normal");
  doc.text(days + ' (' + numberToWords(days) + ') hari kerja', 77, y);
  
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Tanggal Cuti", 30, y);
  doc.text(":", 72, y);
  doc.setFont("helvetica", "normal");
  doc.text(startStr + ' s/d ' + endStr, 77, y);
  
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Alasan", 30, y);
  doc.text(":", 72, y);
  doc.setFont("helvetica", "normal");
  const reasonText = doc.splitTextToSize(permit.reason || '-', 100);
  doc.text(reasonText, 77, y);
  y += (reasonText.length - 1) * 5;
  
  // Body paragraph
  y += 12;
  doc.setFontSize(10);
  const paragraph = 'Selama ' + days + ' (' + numberToWords(days) + ') hari kerja, terhitung mulai tanggal ' + startStr + ' sampai dengan tanggal ' + endStr + ', dengan ketentuan setelah berakhirnya jangka waktu cuti tersebut wajib melaporkan diri kembali dan melaksanakan tugas sebagaimana mestinya.';
  
  const text1 = doc.splitTextToSize(paragraph, 170);
  doc.text(text1, 20, y);
  y += text1.length * 5 + 5;
  
  const paragraph2 = 'Demikian surat izin cuti ini dibuat untuk dapat dipergunakan sebagaimana mestinya.';
  const text2 = doc.splitTextToSize(paragraph2, 170);
  doc.text(text2, 20, y);
  
  // --- QR CODE (Real QR using qrcode-generator) ---
  y += 20;
  let qrImageData = null;
  const qrContent = window.location.href.split('?')[0] + '?verify=' + permit.id;
  
  try {
    if (typeof qrcode !== 'undefined') {
      const qr = qrcode(0, 'M');
      qr.addData(qrContent);
      qr.make();
      
      const cellSize = 2;
      const moduleCount = qr.getModuleCount();
      const canvasSize = moduleCount * cellSize;
      
      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = canvasSize;
      qrCanvas.height = canvasSize;
      const qrCtx = qrCanvas.getContext('2d');
      
      qrCtx.fillStyle = '#ffffff';
      qrCtx.fillRect(0, 0, canvasSize, canvasSize);
      qrCtx.fillStyle = '#000000';
      
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            qrCtx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
        }
      }
      
      qrImageData = qrCanvas.toDataURL('image/png');
    }
  } catch (e) {
    console.warn('QR Code generation failed:', e);
  }
  
  if (qrImageData) {
    doc.addImage(qrImageData, 'PNG', 22, y - 5, 25, 25);
  } else {
    doc.setDrawColor(0);
    doc.rect(22, y - 5, 25, 25);
    doc.setFontSize(6);
    doc.text("QR VERIFIED", 26, y + 8);
    doc.text(permit.id, 23, y + 14);
  }
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Scan untuk verifikasi", 23, y + 23);
  doc.setTextColor(0, 0, 0);
  
  // --- SIGNATURE BLOCK (Kepala Dinas) ---
  const sigX = 125;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Puruk Cahu, " + approvedDateStr, sigX, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Kepala Dinas Kependudukan dan", sigX, y);
  doc.text("Pencatatan Sipil", sigX, y + 4);
  doc.text("Kabupaten Murung Raya", sigX, y + 8);
  
  y += 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("GEMA TOPANDAS TIDJA, S.Sos., M.M", sigX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Pembina Tingkat I (IV/b)", sigX, y);
  y += 5;
  doc.text("NIP. 19781005 200701 1 008", sigX, y);
  
  // --- SYSTEM METADATA / APPROVAL NOTE ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text('Diverifikasi oleh: ' + (permit.approved_by || '-'), 20, 275);
  
  doc.save('Surat_Cuti_' + empName.replace(/\s+/g, '_') + '_' + permit.start_date + '.pdf');
  showToast("Unduh PDF", "Surat Izin Cuti berhasil diunduh.", "success");
};

window.downloadTravelPDF = function(permitId) {
  const permit = db.permits.find(p => p.id === permitId);
  if (!permit) {
    showToast("Error", "Data pengajuan tidak ditemukan.", "error");
    return;
  }
  
  if (!window.jspdf) {
    showToast("Error", "Library PDF belum termuat.", "error");
    return;
  }
  
  const emp = db.users.find(u => u.id === permit.user_id);
  const empName = emp ? emp.name : 'N/A';
  const empPos = emp ? emp.position : 'N/A';
  
  const startStr = formatIndoDate(permit.start_date);
  const endStr = formatIndoDate(permit.end_date);
  const approvedDateStr = permit.approved_at ? formatIndoDate(permit.approved_at.split('T')[0]) : formatIndoDate(new Date().toISOString().split('T')[0]);
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // --- KOP SURAT with Logo ---
  const headerCenterX = 116;
  
  if (LOGO_BASE64) {
    try {
      doc.addImage(LOGO_BASE64, 'PNG', 20, 8, 22, 25);
    } catch (e) {
      console.warn('Failed to add logo to PDF:', e);
    }
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PEMERINTAH KABUPATEN MURUNG RAYA", headerCenterX, 14, { align: "center" });
  doc.setFontSize(13);
  doc.text("DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL", headerCenterX, 20, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Jl. Bina Praja No. Puruk Cahu Kode Pos 73911", headerCenterX, 25, { align: "center" });
  
  // Segmented contact details line
  doc.setFontSize(8);
  
  doc.setFont("helvetica", "italic");
  const w1 = doc.getTextWidth("Telp. ");
  
  doc.setFont("helvetica", "normal");
  const w2 = doc.getTextWidth("(0828) 31813 ");
  
  doc.setFont("helvetica", "italic");
  const w3 = doc.getTextWidth("Fax. ");
  
  doc.setFont("helvetica", "normal");
  const w4 = doc.getTextWidth("(0528) 31814 ");
  
  doc.setFont("helvetica", "italic");
  const w5 = doc.getTextWidth("Email. ");
  
  doc.setFont("helvetica", "normal");
  const w6 = doc.getTextWidth("disdukcapil@murungrayakab.go.id");
  
  const totalWidth = w1 + w2 + w3 + w4 + w5 + w6;
  const contactStartX = headerCenterX - (totalWidth / 2);
  let currentX = contactStartX;
  const contactY = 30;
  
  doc.setFont("helvetica", "italic");
  doc.text("Telp. ", currentX, contactY);
  currentX += w1;
  
  doc.setFont("helvetica", "normal");
  doc.text("(0828) 31813 ", currentX, contactY);
  currentX += w2;
  
  doc.setFont("helvetica", "italic");
  doc.text("Fax. ", currentX, contactY);
  currentX += w3;
  
  doc.setFont("helvetica", "normal");
  doc.text("(0528) 31814 ", currentX, contactY);
  currentX += w4;
  
  doc.setFont("helvetica", "italic");
  doc.text("Email. ", currentX, contactY);
  currentX += w5;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 255);
  doc.text("disdukcapil@murungrayakab.go.id", currentX, contactY);
  
  // Draw underline for email
  doc.setDrawColor(0, 0, 255);
  doc.setLineWidth(0.1);
  doc.line(currentX, contactY + 0.5, currentX + w6, contactY + 0.5);
  
  // Reset colors and linewidth
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  
  // Double line separator
  doc.setLineWidth(0.8);
  doc.line(20, 34, 190, 34);
  doc.setLineWidth(0.25);
  doc.line(20, 35.5, 190, 35.5);
  
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("SURAT JALAN", 105, 45, { align: "center" });
  
  // Reference number
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const refNo = permit.leave_letter_number 
    ? 'Nomor: ' + permit.leave_letter_number
    : 'Nomor: -';
  doc.text(refNo, 105, 51, { align: "center" });
  
  // Underline title
  doc.setLineWidth(0.3);
  doc.line(70, 52, 140, 52);
  
  // Body opening
  let y = 62;
  doc.setFontSize(10);
  doc.text("Diberikan perintah tugas jalan kepada Pegawai Outsourcing berikut:", 20, y);
  
  // Employee details
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Nama", 30, y);
  doc.text(":", 72, y);
  doc.setFont("helvetica", "normal");
  doc.text(empName, 77, y);
  
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Jabatan/Posisi", 30, y);
  doc.text(":", 72, y);
  doc.setFont("helvetica", "normal");
  doc.text(empPos, 77, y);
  
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Unit Kerja", 30, y);
  doc.text(":", 72, y);
  doc.setFont("helvetica", "normal");
  doc.text("Dinas Kependudukan dan Pencatatan Sipil Kab. Murung Raya", 77, y);
  
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Tugas / Keperluan", 30, y);
  doc.text(":", 72, y);
  doc.setFont("helvetica", "normal");
  doc.text("Mengantar Kepala Dinas Kependudukan dan Pencatatan Sipil", 77, y);
  
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Tanggal Tugas", 30, y);
  doc.text(":", 72, y);
  doc.setFont("helvetica", "normal");
  doc.text(startStr + ' s/d ' + endStr, 77, y);
  
  // Body paragraph
  y += 12;
  doc.setFontSize(10);
  const paragraph = 'Demikian Surat Jalan ini dibuat untuk dapat dilaksanakan dengan penuh tanggung jawab dan dipergunakan sebagaimana mestinya.';
  const text1 = doc.splitTextToSize(paragraph, 170);
  doc.text(text1, 20, y);
  
  // --- QR CODE (Real QR using qrcode-generator) ---
  y += 20;
  let qrImageData = null;
  const qrContent = window.location.href.split('?')[0] + '?verify=' + permit.id;
  
  try {
    if (typeof qrcode !== 'undefined') {
      const qr = qrcode(0, 'M');
      qr.addData(qrContent);
      qr.make();
      
      const cellSize = 2;
      const moduleCount = qr.getModuleCount();
      const canvasSize = moduleCount * cellSize;
      
      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = canvasSize;
      qrCanvas.height = canvasSize;
      const qrCtx = qrCanvas.getContext('2d');
      
      qrCtx.fillStyle = '#ffffff';
      qrCtx.fillRect(0, 0, canvasSize, canvasSize);
      qrCtx.fillStyle = '#000000';
      
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            qrCtx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
        }
      }
      
      qrImageData = qrCanvas.toDataURL('image/png');
    }
  } catch (e) {
    console.warn('QR Code generation failed:', e);
  }
  
  if (qrImageData) {
    doc.addImage(qrImageData, 'PNG', 22, y - 5, 25, 25);
  } else {
    doc.setDrawColor(0);
    doc.rect(22, y - 5, 25, 25);
    doc.setFontSize(6);
    doc.text("QR VERIFIED", 26, y + 8);
    doc.text(permit.id, 23, y + 14);
  }
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Scan untuk verifikasi", 23, y + 23);
  doc.setTextColor(0, 0, 0);
  
  // --- SIGNATURE BLOCK (Kepala Dinas) ---
  const sigX = 125;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Puruk Cahu, " + approvedDateStr, sigX, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Kepala Dinas Kependudukan dan", sigX, y);
  doc.text("Pencatatan Sipil", sigX, y + 4);
  doc.text("Kabupaten Murung Raya", sigX, y + 8);
  
  y += 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("GEMA TOPANDAS TIDJA, S.Sos., M.M", sigX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Pembina Tingkat I (IV/b)", sigX, y);
  y += 5;
  doc.text("NIP. 19781005 200701 1 008", sigX, y);
  
  // --- SYSTEM METADATA / APPROVAL NOTE ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text('Diverifikasi oleh: ' + (permit.approved_by || '-'), 20, 275);
  
  doc.save('Surat_Jalan_' + empName.replace(/\s+/g, '_') + '_' + permit.start_date + '.pdf');
  showToast("Unduh PDF", "Surat Jalan berhasil diunduh.", "success");
};

// Helper: Convert number to Indonesian words for leave letter
function numberToWords(num) {
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  if (num <= 11) return satuan[num];
  if (num <= 19) return satuan[num - 10] + ' belas';
  if (num <= 99) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return satuan[tens] + ' puluh' + (ones ? ' ' + satuan[ones] : '');
  }
  return String(num);
}

// Start core system
document.addEventListener("DOMContentLoaded", initApp);

