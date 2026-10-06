const express = require('express');
const cors = require('cors');
const path = require('path'); // 1. Wajib import path untuk membaca folder
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Agar bisa menerima data JSON dari frontend

// ==========================================
// 2. KONFIGURASI FRONTEND (AGAR TIDAK "Cannot GET /")
// ==========================================
// Menghubungkan folder 'keuangan-frontend/dist' agar file hasil build React bisa dibaca server
const frontendPath = path.join(__dirname, '../keuangan-frontend/dist');
app.use(express.static(frontendPath));

// Direct all non-API GET requests to index.html for React SPA
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        next();
    }
});

// ==========================================
// DAFTAR RUTE API (ROUTES)
// ==========================================

// Rute untuk Login (Otentikasi)
app.use('/api/auth', require('./routes/authRoutes'));

// Rute untuk Halaman Rincian SPM (CRUD)
app.use('/api/spm', require('./routes/spmRoutes'));

// Rute untuk Kalkulasi Realisasi
app.use('/api/realisasi', require('./routes/realisasiRoutes'));

// Rute untuk Master Data Anggaran (Realisasi 2026)
app.use('/api/anggaran', require('./routes/anggaranRoutes'));

// Rute untuk Manajemen Pengguna (Super Admin ONLY)
app.use('/api/users', require('./routes/userRoutes'));

// Rute untuk Log Aktivitas / Audit Trail (Super Admin ONLY)
app.use('/api/logs', require('./routes/logRoutes'));

// Rute untuk Formulir Verifikasi Dokumen Tanpa SPK
app.use('/api/form-verifikasi', require('./routes/verifikasiRoutes'));

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`Server Backend menyala dengan mulus di http://localhost:${PORT}`);
});