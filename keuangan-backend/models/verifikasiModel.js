const db = require('../config/database');

// Auto-initialize form_verifikasi table on model load
const initVerifikasiTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS form_verifikasi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        jenis_dokumen VARCHAR(50) NULL,
        spm_id INT NULL,
        kw_no VARCHAR(255) NULL,
        akun VARCHAR(255) NULL,
        no_verifikasi VARCHAR(255) NULL,
        nama_unit_kerja VARCHAR(255) NULL,
        nama_rekanan VARCHAR(255) NULL,
        nama_kegiatan TEXT NULL,
        nilai_kwitansi DECIMAL(18, 2) DEFAULT 0,
        kelengkapan_dokumen JSON NULL,
        rincian_pajak JSON NULL,
        tanggal_verifikasi DATE NULL,
        nama_verifikator VARCHAR(255) NULL,
        nama_kasubbag VARCHAR(255) NULL,
        jabatan_pimpinan VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await db.query(createTableQuery);

    try {
      await db.query(`ALTER TABLE form_verifikasi ADD COLUMN jenis_dokumen VARCHAR(50) NULL;`);
    } catch (colErr) {}
    try {
      await db.query(`ALTER TABLE form_verifikasi ADD COLUMN jabatan_pimpinan VARCHAR(255) NULL;`);
    } catch (colErr) {
      // Column may already exist
    }
  } catch (err) {
    console.error('Error initializing form_verifikasi table:', err.message);
  }
};

initVerifikasiTable();

const getAllVerifikasi = async (spmId = null) => {
  let query = 'SELECT * FROM form_verifikasi';
  const params = [];
  if (spmId) {
    query += ' WHERE spm_id = ?';
    params.push(spmId);
  }
  query += ' ORDER BY no_verifikasi DESC, created_at DESC';

  const [rows] = await db.query(query, params);
  return rows.map(row => {
    let kelengkapan = row.kelengkapan_dokumen;
    let pajak = row.rincian_pajak;

    if (typeof kelengkapan === 'string') {
      try { kelengkapan = JSON.parse(kelengkapan); } catch (e) { kelengkapan = []; }
    }
    if (typeof pajak === 'string') {
      try { pajak = JSON.parse(pajak); } catch (e) { pajak = {}; }
    }

    return {
      ...row,
      kelengkapan_dokumen: kelengkapan,
      rincian_pajak: pajak
    };
  });
};

const getVerifikasiById = async (id) => {
  const [rows] = await db.query('SELECT * FROM form_verifikasi WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  const row = rows[0];

  let kelengkapan = row.kelengkapan_dokumen;
  let pajak = row.rincian_pajak;

  if (typeof kelengkapan === 'string') {
    try { kelengkapan = JSON.parse(kelengkapan); } catch (e) { kelengkapan = []; }
  }
  if (typeof pajak === 'string') {
    try { pajak = JSON.parse(pajak); } catch (e) { pajak = {}; }
  }

  return {
    ...row,
    kelengkapan_dokumen: kelengkapan,
    rincian_pajak: pajak
  };
};

const createVerifikasi = async (data) => {
  const {
    jenis_dokumen,
    spm_id,
    kw_no,
    akun,
    no_verifikasi,
    nama_unit_kerja,
    nama_rekanan,
    nama_kegiatan,
    nilai_kwitansi,
    kelengkapan_dokumen,
    rincian_pajak,
    tanggal_verifikasi,
    nama_verifikator,
    nama_kasubbag,
    jabatan_pimpinan
  } = data;

  const jsonKelengkapan = typeof kelengkapan_dokumen === 'object' 
    ? JSON.stringify(kelengkapan_dokumen) 
    : kelengkapan_dokumen;

  const jsonPajak = typeof rincian_pajak === 'object' 
    ? JSON.stringify(rincian_pajak) 
    : rincian_pajak;

  const query = `
    INSERT INTO form_verifikasi (
      jenis_dokumen, spm_id, kw_no, akun, no_verifikasi, nama_unit_kerja, nama_rekanan, 
      nama_kegiatan, nilai_kwitansi, kelengkapan_dokumen, rincian_pajak, 
      tanggal_verifikasi, nama_verifikator, nama_kasubbag, jabatan_pimpinan
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.query(query, [
    jenis_dokumen || 'TANPA_SPK',
    spm_id || null,
    kw_no || '',
    akun || '',
    no_verifikasi || '',
    nama_unit_kerja || '',
    nama_rekanan || '',
    nama_kegiatan || '',
    typeof nilai_kwitansi === 'number' ? nilai_kwitansi : (parseFloat(String(nilai_kwitansi || 0).replace(/Rp/gi, '').split(',')[0].replace(/\./g, '').replace(/[^0-9]/g, '')) || 0),
    jsonKelengkapan || '[]',
    jsonPajak || '{}',
    tanggal_verifikasi || null,
    nama_verifikator || '',
    nama_kasubbag || '',
    jabatan_pimpinan || 'Kepala Subbagian Tata Usaha'
  ]);

  return result.insertId;
};

const updateVerifikasi = async (id, data) => {
  const {
    jenis_dokumen,
    spm_id,
    kw_no,
    akun,
    no_verifikasi,
    nama_unit_kerja,
    nama_rekanan,
    nama_kegiatan,
    nilai_kwitansi,
    kelengkapan_dokumen,
    rincian_pajak,
    tanggal_verifikasi,
    nama_verifikator,
    nama_kasubbag,
    jabatan_pimpinan
  } = data;

  const jsonKelengkapan = typeof kelengkapan_dokumen === 'object' 
    ? JSON.stringify(kelengkapan_dokumen) 
    : kelengkapan_dokumen;

  const jsonPajak = typeof rincian_pajak === 'object' 
    ? JSON.stringify(rincian_pajak) 
    : rincian_pajak;

  const query = `
    UPDATE form_verifikasi SET 
      jenis_dokumen = ?, spm_id = ?, kw_no = ?, akun = ?, no_verifikasi = ?, nama_unit_kerja = ?, 
      nama_rekanan = ?, nama_kegiatan = ?, nilai_kwitansi = ?, kelengkapan_dokumen = ?, 
      rincian_pajak = ?, tanggal_verifikasi = ?, nama_verifikator = ?, nama_kasubbag = ?, 
      jabatan_pimpinan = ?
    WHERE id = ?
  `;

  const [result] = await db.query(query, [
    jenis_dokumen || 'TANPA_SPK',
    spm_id || null,
    kw_no || '',
    akun || '',
    no_verifikasi || '',
    nama_unit_kerja || '',
    nama_rekanan || '',
    nama_kegiatan || '',
    typeof nilai_kwitansi === 'number' ? nilai_kwitansi : (parseFloat(String(nilai_kwitansi || 0).replace(/Rp/gi, '').split(',')[0].replace(/\./g, '').replace(/[^0-9]/g, '')) || 0),
    jsonKelengkapan || '[]',
    jsonPajak || '{}',
    tanggal_verifikasi || null,
    nama_verifikator || '',
    nama_kasubbag || '',
    jabatan_pimpinan || 'Kepala Subbagian Tata Usaha',
    id
  ]);

  return result.affectedRows;
};

const deleteVerifikasi = async (id) => {
  const [result] = await db.query('DELETE FROM form_verifikasi WHERE id = ?', [id]);
  return result.affectedRows;
};

module.exports = {
  getAllVerifikasi,
  getVerifikasiById,
  createVerifikasi,
  updateVerifikasi,
  deleteVerifikasi
};
