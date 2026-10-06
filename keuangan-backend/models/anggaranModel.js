const db = require('../config/database');

const createAnggaran = async (data) => {
    // 1. Destructuring ditambahkan volume, harga_satuan, dan judul_subbagian_id
    const { level, kode, uraian, volume, harga_satuan, pagu, parent_id, judul_subbagian_id } = data;
    const pid = parent_id ? parent_id : null; // Jika kosong, jadikan NULL (Paling Atas)
    const subbagian_id = judul_subbagian_id ? judul_subbagian_id : null;
    
    // 2. Query INSERT ditambahkan kolom volume, harga_satuan, dan judul_subbagian_id
    const [result] = await db.query(
        `INSERT INTO master_anggaran (level, kode, uraian, volume, harga_satuan, pagu, parent_id, judul_subbagian_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [level, kode, uraian, volume || null, harga_satuan || 0, pagu || 0, pid, subbagian_id]
    );
    return result;
};

// ==========================================
// FUNGSI INI YANG DIUBAH (Fungsi Bawaanmu)
// ==========================================
const getAllAnggaran = async () => {
    // 1. Ambil semua data asli dari database
    const [rows] = await db.query('SELECT * FROM master_anggaran ORDER BY id ASC');
    
    // 2. Buat map (kamus) untuk mempermudah pencarian berdasarkan ID
    const mapData = new Map();
    rows.forEach(row => mapData.set(row.id, row));

    // 3. Modifikasi data sebelum dikirim ke frontend
    const processedRows = rows.map(row => {
        let current = row;
        let ro_kode = null;
        let akun_kode = null;

        // Telusuri "silsilah" ke atas (ke parent) sampai mentok ujung
        while (current) {
            // Jika dalam penelusuran ke atas ketemu level RO, catat kodenya
            if (current.level.includes('RO') || current.level.includes('3')) {
                ro_kode = current.kode;
            }
            // Jika dalam penelusuran ketemu level Akun, catat kodenya
            if (current.level.includes('Akun') || current.level.includes('7')) {
                akun_kode = current.kode;
            }
            
            // Lanjut naik tingkat ke parent di atasnya
            current = mapData.get(current.parent_id);
        }

        // Kembalikan row asli ditambah "ro_kode" dan "akun_kode" untuk dibaca Frontend
        return {
            ...row,
            ro_kode: ro_kode,
            akun_kode: akun_kode
        };
    });

    return processedRows; // Kirim data yang sudah diolah
};

const updateAnggaran = async (id, data) => {
    // 1. Destructuring ditambahkan volume, harga_satuan, dan judul_subbagian_id
    const { level, kode, uraian, volume, harga_satuan, pagu, parent_id, judul_subbagian_id } = data;
    const pid = parent_id ? parent_id : null;
    const subbagian_id = judul_subbagian_id ? judul_subbagian_id : null;
    
    // 2. Query UPDATE ditambahkan kolom volume, harga_satuan, dan judul_subbagian_id
    const [result] = await db.query(
        `UPDATE master_anggaran SET level = ?, kode = ?, uraian = ?, volume = ?, harga_satuan = ?, pagu = ?, parent_id = ?, judul_subbagian_id = ? WHERE id = ?`,
        [level, kode, uraian, volume || null, harga_satuan || 0, pagu || 0, pid, subbagian_id, id]
    );
    return result;
};

const deleteAnggaran = async (id) => {
    const [result] = await db.query('DELETE FROM master_anggaran WHERE id = ?', [id]);
    return result;
};

// ==========================================
// TAMBAHAN UNTUK FITUR DEPENDENT DROPDOWN
// ==========================================

// 1. Ambil semua KRO (Diasumsikan level mengandung angka 2 atau kata KRO)
const getKRO = async () => {
    // Ubah %2% menjadi %3%
    const [rows] = await db.query(`SELECT * FROM master_anggaran WHERE level LIKE '%3%' OR level LIKE '%KRO%'`);
    return rows;
};

// 2. Ambil anak langsung berdasarkan parent_id (Untuk mencari RO dari ID KRO)
const getByParentId = async (parentId) => {
    const [rows] = await db.query(`SELECT * FROM master_anggaran WHERE parent_id = ?`, [parentId]);
    return rows;
};

// 3. Query Rekursif untuk melompat antar level (Misal: dari RO langsung cari Akun level 7)
const getDescendantsByLevel = async (parentId, targetLevelString) => {
    // Menggunakan CTE (Common Table Expressions) MySQL
    const query = `
        WITH RECURSIVE MasterHierarchy AS (
            -- Base case: Ambil parent awalnya (ditambahkan volume, harga_satuan, dan judul_subbagian_id)
            SELECT id, parent_id, level, kode, uraian, volume, harga_satuan, pagu, judul_subbagian_id 
            FROM master_anggaran 
            WHERE id = ?
            
            UNION ALL
            
            -- Recursive step: Ambil anak-anak yang parent_id-nya adalah id dari hasil di atas
            SELECT m.id, m.parent_id, m.level, m.kode, m.uraian, m.volume, m.harga_satuan, m.pagu, m.judul_subbagian_id 
            FROM master_anggaran m
            INNER JOIN MasterHierarchy h ON m.parent_id = h.id
        )
        -- Ambil hasil akhirnya yang levelnya sesuai target (misal mengandung angka '7')
        SELECT * FROM MasterHierarchy WHERE level LIKE CONCAT('%', ?, '%')
    `;
    const [rows] = await db.query(query, [parentId, targetLevelString]);
    return rows;
};

// Pastikan semua fungsi diekspor
module.exports = { 
    createAnggaran, 
    getAllAnggaran, 
    updateAnggaran, 
    deleteAnggaran,
    getKRO,
    getByParentId,
    getDescendantsByLevel
};