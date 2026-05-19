# Panduan Deploy Absensi Outsourcing ke Vercel & Neon PostgreSQL

Aplikasi ini sekarang telah dilengkapi dengan backend serverless API (Node.js) sehingga dapat dihubungkan ke database PostgreSQL cloud di **Neon** dan dideploy ke **Vercel** dengan sinkronisasi data yang aman dan real-time.

---

## 1. Persiapan Database (Neon.tech)

1. Daftar akun di [Neon.tech](https://neon.tech/) (Gratis).
2. Buat project baru, pilih region terdekat (misal: **Singapore**).
3. Salin **Connection String** PostgreSQL yang diberikan. Formatnya akan seperti ini:
   ```text
   postgresql://alex:xxxxxxxxx@ep-cool-pool-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Simpan string ini untuk dimasukkan ke Vercel nanti.

---

## 2. Push Kode ke GitHub

1. Buka folder proyek ini di terminal atau Visual Studio Code.
2. Hubungkan ke repository GitHub baru Anda:
   ```bash
   git init
   git add .
   git commit -m "Inisialisasi sistem absensi dengan Neon DB & Vercel API"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA_REPO.git
   git push -u origin main
   ```

---

## 3. Deploy ke Vercel

1. Buka dashboard [Vercel](https://vercel.com/) dan buat project baru.
2. Hubungkan dengan repositori GitHub yang baru saja Anda push.
3. Di bagian **Environment Variables**, tambahkan variabel berikut:
   * **Key**: `DATABASE_URL`
   * **Value**: *[Tempel Connection String dari Neon yang Anda salin di Langkah 1]*
4. Klik **Deploy**.
5. Tunggu proses build selesai.

---

## 4. Inisialisasi Database (Setup Awal)

Setelah deploy di Vercel selesai, Anda perlu membuat struktur tabel database dan memasukkan data pegawai awal:
1. Buka browser dan jalankan URL berikut (sesuaikan dengan domain Vercel Anda):
   ```text
   https://domain-anda-di-vercel.app/api/setup
   ```
2. Halaman tersebut akan membalas dengan respon JSON:
   ```json
   { "success": true, "message": "Database initialized successfully" }
   ```
3. Selamat! Tabel dan akun pegawai awal (termasuk Admin Francis) berhasil dibuat di Neon PostgreSQL Anda.

---

## Akun Default Setelah Setup:
* **Administrator**: `admin@disdukcapil.go.id` | Sandi: `130623@!`
* **Pegawai Outsourcing 1**: `karyawan@disdukcapil.go.id` | Sandi: `password123`
