# API Documentation - Sistem Informasi Keuangan

## 1. Global Config
- **Base URL:** `http://localhost:5000/api`
- **Database:** MySQL (`sistem_keuangan`)
- **Tech Stack Backend:** Node.js + Express.js
- **Content-Type:** `application/json`

---

## 2. Database Schema & API Endpoints

### A. AUTHENTICATION (`/api/auth`)
- **Tabel Terkait:** `users` (`id`, `username`, `password`, `role`, `created_at`)

#### 1. Login User
- **Method:** `POST /api/auth/login`
- **Request Body:**
  ```json
  {
    "username": "admin_username",
    "password": "secret_password"
  }
Response Success (200 OK):

JSON
{
  "status": "success",
  "data": {
    "id": 1,
    "username": "admin_username",
    "role": "User",
    "token": "<jwt_or_session_token>"
  }
}
B. RINCIAN SPM (/api/spm)
Tabel Terkait: transaksi_spm

Daftar Kolom (Field DB): id, kegiatan, keterangan, kontrak, kro, nomor_akun, proses, rekanan, ro, sp2d_nilai, sp2d_nomor, sp2d_tanggal, spm_nilai, spm_nomor, spm_tanggal, tipe, verifikasi_nilai, verifikasi_nomor, verifikasi_tanggal, created_at, updated_at

1. Get All Transaksi SPM
Method: GET /api/spm

Response Success (200 OK):

JSON
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "spm_nomor": "00102/100/2026",
      "spm_tanggal": "2026-07-28",
      "spm_nilai": 15000000.00,
      "rekanan": "PT. Contoh Sejahtera",
      "keterangan": "Pembayaran Belanja Modal",
      "proses": "SP2D Terbit",
      "sp2d_nomor": "9988776655",
      "sp2d_tanggal": "2026-07-29",
      "sp2d_nilai": 15000000.00
    }
  ]
}
2. Create Transaksi SPM Baru
Method: POST /api/spm

Request Body (Contoh Payload):

JSON
{
  "spm_nomor": "00103/100/2026",
  "spm_tanggal": "2026-07-30",
  "spm_nilai": 5000000,
  "rekanan": "CV. Maju Terus",
  "keterangan": "Pengadaan ATK",
  "kro": "054.01",
  "ro": "001",
  "nomor_akun": "521111",
  "proses": "Verifikasi"
}
3. Update & Delete SPM
Method: PUT /api/spm/:id (Update Data SPM)

Method: DELETE /api/spm/:id (Hapus Data SPM)

C. MASTER DATA ANGGARAN & TARGET DIPA (/api/anggaran)
Tabel Terkait:

master_anggaran (id, parent_id, judul_subbagian_id, kode, level, uraian, pagu, harga_satuan, volume)

master_target_dipa (id, kode_belanja, nama_belanja, target_persen)

master_jenis_belanja (id, kode, nama)

judul_subbagian (id, nama_judul)

1. Get Master Anggaran (Realisasi 2026)
Method: GET /api/anggaran

Response Success (200 OK):

JSON
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "kode": "054.01.WA",
      "uraian": "Belanja Barang Operasional",
      "level": "SUBBAGIAN",
      "pagu": 100000000.00,
      "volume": "100 Unit",
      "harga_satuan": 1000000.00
    }
  ]
}
2. Get Target DIPA
Method: GET /api/anggaran/target-dipa (atau route sejenis)

Response Success (200 OK):

JSON
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "kode_belanja": "52",
      "nama_belanja": "Belanja Barang",
      "target_persen": 85.00
    }
  ]
}
D. KALKULASI REALISASI (/api/realisasi)
Method: GET /api/realisasi

Description: Mengambil data gabungan/perhitungan antara pagu anggaran (master_anggaran) dengan realisasi pengeluaran (transaksi_spm).