const db = require('../config/database');

const initSpmTable = async () => {
    try {
        await db.query(`ALTER TABLE transaksi_spm ADD COLUMN tahun INT NULL;`);
    } catch (e) {
        // Column may already exist
    }
};
initSpmTable();

const createSpm = async (data) => {
    const {
        tahun, rekanan, verifikasi_tanggal, verifikasi_nomor, verifikasi_nilai,
        tipe, keterangan, proses, kontrak, nomor_akun, kro, ro, kegiatan,
        spm_tanggal, spm_nomor, spm_nilai, sp2d_tanggal, sp2d_nomor, sp2d_nilai
    } = data;
    
    const targetTahun = tahun || (verifikasi_tanggal ? new Date(verifikasi_tanggal).getFullYear() : new Date().getFullYear());

    const [result] = await db.query(
        `INSERT INTO transaksi_spm 
        (tahun, rekanan, verifikasi_tanggal, verifikasi_nomor, verifikasi_nilai, tipe, keterangan, proses, kontrak, nomor_akun, kro, ro, kegiatan, spm_tanggal, spm_nomor, spm_nilai, sp2d_tanggal, sp2d_nomor, sp2d_nilai) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [targetTahun, rekanan, verifikasi_tanggal, verifikasi_nomor, verifikasi_nilai, tipe, keterangan, proses, kontrak, nomor_akun, kro, ro, kegiatan, spm_tanggal, spm_nomor, spm_nilai, sp2d_tanggal, sp2d_nomor, sp2d_nilai]
    );
    return result;
};

const getAllSpm = async () => {
    const [spmRows] = await db.query('SELECT * FROM transaksi_spm ORDER BY created_at DESC');

    let verifRows = [];
    try {
        const [vRows] = await db.query('SELECT * FROM form_verifikasi ORDER BY created_at DESC');
        verifRows = vRows || [];
    } catch (e) {
        console.error('Error fetching form_verifikasi for getAllSpm:', e.message);
    }

    const existingVerifNo = new Set();
    const existingSpmIds = new Set();
    spmRows.forEach(row => {
        if (row.verifikasi_nomor && String(row.verifikasi_nomor).trim() !== '') {
            existingVerifNo.add(String(row.verifikasi_nomor).trim());
        }
        if (row.id) {
            existingSpmIds.add(row.id);
        }
    });

    const mappedVerifRows = verifRows
        .filter(v => {
            if (v.spm_id && existingSpmIds.has(v.spm_id)) return false;
            if (v.no_verifikasi && existingVerifNo.has(String(v.no_verifikasi).trim())) return false;
            return true;
        })
        .map(v => {
            const displayTipe = v.jenis_dokumen === 'PERJALANAN_DINAS' 
                ? 'Perjalanan Dinas' 
                : (v.jenis_dokumen === 'KONTRAK' ? 'Kontrak' : 'Form Verifikasi');
            const displayKontrak = v.jenis_dokumen === 'KONTRAK' ? (v.nama_unit_kerja || 'Kontrak') : '-';
            const nominalVal = v.nilai_kwitansi || 0;

            return {
                id: `verif_${v.id}`,
                rekanan: v.nama_rekanan || '-',
                nama_rekanan: v.nama_rekanan || '-',
                verifikasi_tanggal: v.tanggal_verifikasi || v.created_at,
                tanggal_verifikasi: v.tanggal_verifikasi || v.created_at,
                verifikasi_nomor: v.no_verifikasi || '-',
                no_verifikasi: v.no_verifikasi || '-',
                verifikasi_nilai: nominalVal,
                spm_nilai: nominalVal,
                nilai_kwitansi: nominalVal,
                nilai: nominalVal,
                tipe: displayTipe,
                keterangan: v.nama_kegiatan || '-',
                proses: 'Verifikasi',
                status_verifikasi: 'Verifikasi',
                status: 'Verifikasi',
                kontrak: displayKontrak,
                nomor_akun: v.akun || '-',
                kro: v.kw_no || '-',
                ro: '-',
                kegiatan: v.nama_kegiatan || '-',
                spm_tanggal: null,
                spm_nomor: '',
                sp2d_tanggal: null,
                sp2d_nomor: '',
                sp2d_nilai: 0,
                created_at: v.created_at,
                is_from_verifikasi: true
            };
        });

    const combined = [...spmRows, ...mappedVerifRows];
    combined.sort((a, b) => {
        const dateA = new Date(a.created_at || a.verifikasi_tanggal || a.spm_tanggal || 0);
        const dateB = new Date(b.created_at || b.verifikasi_tanggal || b.spm_tanggal || 0);
        return dateB - dateA;
    });
    return combined;
};

// Fungsi untuk mengambil 1 data berdasarkan ID
const getSpmById = async (id) => {
    if (String(id).startsWith('verif_')) {
        const realId = id.replace('verif_', '');
        const [rows] = await db.query('SELECT * FROM form_verifikasi WHERE id = ?', [realId]);
        if (rows.length > 0) {
            const v = rows[0];
            return {
                id: `verif_${v.id}`,
                rekanan: v.nama_rekanan || '-',
                verifikasi_tanggal: v.tanggal_verifikasi || v.created_at,
                verifikasi_nomor: v.no_verifikasi || '-',
                verifikasi_nilai: v.nilai_kwitansi || 0,
                tipe: v.jenis_dokumen === 'PERJALANAN_DINAS' ? 'Perjalanan Dinas' : (v.jenis_dokumen === 'KONTRAK' ? 'Kontrak' : 'Form Verifikasi'),
                keterangan: v.nama_kegiatan || '-',
                proses: 'Verifikasi',
                kontrak: v.jenis_dokumen === 'KONTRAK' ? (v.nama_unit_kerja || 'Kontrak') : '-',
                nomor_akun: v.akun || '-',
                kro: v.kw_no || '-',
                ro: '-',
                kegiatan: v.nama_kegiatan || '-',
                spm_tanggal: null,
                spm_nomor: '',
                spm_nilai: v.nilai_kwitansi || 0,
                sp2d_tanggal: null,
                sp2d_nomor: '',
                sp2d_nilai: 0,
                created_at: v.created_at
            };
        }
        return null;
    }

    const [rows] = await db.query('SELECT * FROM transaksi_spm WHERE id = ?', [id]);
    return rows[0];
};

const updateSpm = async (id, data) => {
    const {
        rekanan, verifikasi_tanggal, verifikasi_nomor, verifikasi_nilai,
        tipe, keterangan, proses, kontrak, nomor_akun, kro, ro, kegiatan,
        spm_tanggal, spm_nomor, spm_nilai, sp2d_tanggal, sp2d_nomor, sp2d_nilai
    } = data;
    
    const [result] = await db.query(
        `UPDATE transaksi_spm SET 
        rekanan=?, verifikasi_tanggal=?, verifikasi_nomor=?, verifikasi_nilai=?, tipe=?, keterangan=?, proses=?, kontrak=?, nomor_akun=?, kro=?, ro=?, kegiatan=?, spm_tanggal=?, spm_nomor=?, spm_nilai=?, sp2d_tanggal=?, sp2d_nomor=?, sp2d_nilai=? 
        WHERE id=?`,
        [rekanan, verifikasi_tanggal, verifikasi_nomor, verifikasi_nilai, tipe, keterangan, proses, kontrak, nomor_akun, kro, ro, kegiatan, spm_tanggal, spm_nomor, spm_nilai, sp2d_tanggal, sp2d_nomor, sp2d_nilai, id]
    );
    return result;
};

const deleteSpm = async (id) => {
    if (String(id).startsWith('verif_')) {
        const realId = id.replace('verif_', '');
        const [result] = await db.query('DELETE FROM form_verifikasi WHERE id = ?', [realId]);
        return result;
    }
    const [result] = await db.query('DELETE FROM transaksi_spm WHERE id = ?', [id]);
    return result;
};

const getSpmByTahun = async (tahun) => {
    const targetTahun = parseInt(tahun);
    const [spmRows] = await db.query(`
        SELECT * FROM transaksi_spm 
        WHERE 
          tahun = ? OR
          (LOWER(proses) = 'selesai' AND YEAR(sp2d_tanggal) = ?) OR
          (LOWER(proses) != 'selesai' AND spm_tanggal IS NOT NULL AND spm_tanggal != '' AND spm_tanggal != '0000-00-00' AND YEAR(spm_tanggal) = ?) OR
          (LOWER(proses) != 'selesai' AND (spm_tanggal IS NULL OR spm_tanggal = '' OR spm_tanggal = '0000-00-00') AND (verifikasi_tanggal IS NULL OR verifikasi_tanggal = '' OR verifikasi_tanggal = '0000-00-00' OR YEAR(verifikasi_tanggal) = ? OR YEAR(created_at) = ?))
        ORDER BY created_at DESC
    `, [targetTahun, targetTahun, targetTahun, targetTahun, targetTahun]);

    let verifRows = [];
    try {
        const [vRows] = await db.query(`
            SELECT * FROM form_verifikasi 
            WHERE 
              YEAR(tanggal_verifikasi) = ? OR 
              YEAR(created_at) = ? OR 
              tanggal_verifikasi IS NULL OR 
              tanggal_verifikasi = '0000-00-00'
            ORDER BY created_at DESC
        `, [targetTahun, targetTahun]);
        verifRows = vRows || [];
    } catch (e) {
        console.error('Error fetching form_verifikasi for getSpmByTahun:', e.message);
    }

    const existingVerifNo = new Set();
    const existingSpmIds = new Set();
    spmRows.forEach(row => {
        if (row.verifikasi_nomor && String(row.verifikasi_nomor).trim() !== '') {
            existingVerifNo.add(String(row.verifikasi_nomor).trim());
        }
        if (row.id) {
            existingSpmIds.add(row.id);
        }
    });

    const mappedVerifRows = verifRows
        .filter(v => {
            if (v.spm_id && existingSpmIds.has(v.spm_id)) return false;
            if (v.no_verifikasi && existingVerifNo.has(String(v.no_verifikasi).trim())) return false;
            return true;
        })
        .map(v => {
            const displayTipe = v.jenis_dokumen === 'PERJALANAN_DINAS' 
                ? 'Perjalanan Dinas' 
                : (v.jenis_dokumen === 'KONTRAK' ? 'Kontrak' : 'Form Verifikasi');
            const displayKontrak = v.jenis_dokumen === 'KONTRAK' ? (v.nama_unit_kerja || 'Kontrak') : '-';
            const nominalVal = v.nilai_kwitansi || 0;

            return {
                id: `verif_${v.id}`,
                rekanan: v.nama_rekanan || '-',
                nama_rekanan: v.nama_rekanan || '-',
                verifikasi_tanggal: v.tanggal_verifikasi || v.created_at,
                tanggal_verifikasi: v.tanggal_verifikasi || v.created_at,
                verifikasi_nomor: v.no_verifikasi || '-',
                no_verifikasi: v.no_verifikasi || '-',
                verifikasi_nilai: nominalVal,
                spm_nilai: nominalVal,
                nilai_kwitansi: nominalVal,
                nilai: nominalVal,
                tipe: displayTipe,
                keterangan: v.nama_kegiatan || '-',
                proses: 'Verifikasi',
                status_verifikasi: 'Verifikasi',
                status: 'Verifikasi',
                kontrak: displayKontrak,
                nomor_akun: v.akun || '-',
                kro: v.kw_no || '-',
                ro: '-',
                kegiatan: v.nama_kegiatan || '-',
                spm_tanggal: null,
                spm_nomor: '',
                sp2d_tanggal: null,
                sp2d_nomor: '',
                sp2d_nilai: 0,
                created_at: v.created_at,
                is_from_verifikasi: true
            };
        });

    const combined = [...spmRows, ...mappedVerifRows];
    combined.sort((a, b) => {
        const dateA = new Date(a.created_at || a.verifikasi_tanggal || a.spm_tanggal || 0);
        const dateB = new Date(b.created_at || b.verifikasi_tanggal || b.spm_tanggal || 0);
        return dateB - dateA;
    });
    return combined;
};

// Fungsi untuk memperbarui data SP2D berdasarkan 5 digit nomor SPM
const updateSp2dDataBySpm = async (spmNomor, sp2dTanggal, sp2dNomor) => {
    const cleanSpm = String(spmNomor).trim();
    const [result] = await db.query(
        `UPDATE transaksi_spm 
         SET sp2d_tanggal = ?, sp2d_nomor = ?, proses = 'Selesai' 
         WHERE TRIM(spm_nomor) = ? OR TRIM(spm_nomor) LIKE ? OR TRIM(spm_nomor) LIKE ?`,
        [sp2dTanggal, sp2dNomor, cleanSpm, `${cleanSpm}/%`, `${cleanSpm}%`]
    );
    return result;
};

module.exports = { createSpm, getAllSpm, getSpmById, updateSpm, deleteSpm, getSpmByTahun, updateSp2dDataBySpm };