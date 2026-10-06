const verifikasiModel = require('../models/verifikasiModel');
const { insertLog } = require('../models/logModel');
const spmModel = require('../models/spmModel');
const db = require('../config/database');

// Konstanta Global Penandatangan Form Verifikasi
const DEFAULT_KASUBBAG = "Sapto Adi Sayogo";
const DEFAULT_VERIFIKATOR = "Rina Kurniawati";

const sanitizeRupiah = (value) => {
    if (!value) return 0;
    let strVal = String(value).replace(/Rp/gi, '').trim();
    strVal = strVal.split(',')[0]; // Buang desimal koma (contoh: ,00)
    if (/\.\d{1,2}$/.test(strVal)) {
        strVal = strVal.split('.')[0]; // Buang desimal titik di akhir (contoh: .00)
    }
    strVal = strVal.replace(/\./g, ''); // Buang semua titik pemisah ribuan
    strVal = strVal.replace(/[^0-9]/g, ''); // Pastikan hanya tersisa angka
    return parseFloat(strVal) || 0;
};

const getVerifikasi = async (req, res) => {
  try {
    const spmId = req.query.spm_id || null;
    const data = await verifikasiModel.getAllVerifikasi(spmId);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    console.error('Error fetching form verifikasi:', err);
    res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data form verifikasi dari server.'
    });
  }
};

const getVerifikasiById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await verifikasiModel.getVerifikasiById(id);
    if (!data) {
      return res.status(404).json({
        status: 'error',
        message: 'Data form verifikasi tidak ditemukan.'
      });
    }
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    console.error('Error fetching form verifikasi by ID:', err);
    res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil detail form verifikasi.'
    });
  }
};

const createVerifikasi = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      nilai_kwitansi: sanitizeRupiah(req.body.nilai_kwitansi),
      nama_kasubbag: DEFAULT_KASUBBAG,
      nama_verifikator: DEFAULT_VERIFIKATOR
    };
    const newId = await verifikasiModel.createVerifikasi(payload);
    const username = req.user ? req.user.username : 'System';

    await insertLog(
      username,
      'TAMBAH',
      'Form Verifikasi',
      `Menambahkan Form Verifikasi No. ${payload.no_verifikasi || newId} - Rekanan: ${payload.nama_rekanan || '-'}`
    );

    // [START REVISI ANTIGRAVITY]: Auto-Insert ke tabel SPM
    try {
      let cleanNilai = payload.nilai_kwitansi;

      // Ekstrak tahun dari tanggal verifikasi, fallback ke tahun saat ini
      const tahunAktif = payload.tanggal_verifikasi 
        ? new Date(payload.tanggal_verifikasi).getFullYear() 
        : new Date().getFullYear();

      const displayTipe = payload.jenis_dokumen === 'PERJALANAN_DINAS' 
        ? 'Perjalanan Dinas' 
        : (payload.jenis_dokumen === 'KONTRAK' ? 'Kontrak' : (payload.tipe || 'Form Verifikasi'));

      const displayKontrak = payload.jenis_dokumen === 'KONTRAK' 
        ? (payload.nama_unit_kerja || 'Kontrak') 
        : (payload.kontrak || '');

      // 2. Mapping data
      const spmData = {
        tahun: tahunAktif,
        rekanan: payload.nama_rekanan || payload.nama_pelaksana || payload.rekanan || '-',
        verifikasi_tanggal: payload.tanggal_verifikasi || payload.verifikasi_tanggal || new Date().toISOString().split('T')[0],
        verifikasi_nomor: payload.no_verifikasi || payload.verifikasi_nomor || '',
        verifikasi_nilai: cleanNilai,
        keterangan: payload.nama_kegiatan || payload.keterangan || payload.kegiatan || '-',
        tipe: displayTipe, 
        proses: payload.proses || payload.status_verifikasi || 'Menunggu',
        kontrak: displayKontrak,
        nomor_akun: payload.akun || payload.nomor_akun || '',
        kro: payload.kw_no || payload.kro || '',
        ro: payload.ro || '',
        kegiatan: payload.nama_kegiatan || payload.kegiatan || payload.keterangan || '-',
        spm_tanggal: null,
        spm_nomor: '',
        spm_nilai: cleanNilai,
        sp2d_tanggal: null,
        sp2d_nomor: '',
        sp2d_nilai: 0
      };

      await spmModel.createSpm(spmData);
    } catch (spmError) {
      console.error('Peringatan: Gagal meneruskan data ke tabel SPM:', spmError);
      return res.status(500).json({
        status: 'error',
        message: 'Berhasil menyimpan form verifikasi, TAPI GAGAL meneruskan data ke tabel SPM. Error DB: ' + spmError.message
      });
    }
    // [END REVISI ANTIGRAVITY]

    res.status(201).json({
      status: 'success',
      message: 'Formulir verifikasi berhasil disimpan.',
      id: newId
    });
  } catch (err) {
    console.error('Error creating form verifikasi:', err);
    res.status(500).json({
      status: 'error',
      message: 'Gagal menyimpan formulir verifikasi ke database.'
    });
  }
};

const updateVerifikasi = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await verifikasiModel.getVerifikasiById(id);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Form verifikasi tidak ditemukan.'
      });
    }

    const payload = {
      ...req.body,
      nilai_kwitansi: sanitizeRupiah(req.body.nilai_kwitansi),
      nama_kasubbag: DEFAULT_KASUBBAG,
      nama_verifikator: DEFAULT_VERIFIKATOR
    };

    await verifikasiModel.updateVerifikasi(id, payload);

    // Sync to transaksi_spm if matching row exists
    try {
      const cleanNilai = payload.nilai_kwitansi;
      const displayTipe = payload.jenis_dokumen === 'PERJALANAN_DINAS' 
        ? 'Perjalanan Dinas' 
        : (payload.jenis_dokumen === 'KONTRAK' ? 'Kontrak' : (payload.tipe || 'Form Verifikasi'));
      const displayKontrak = payload.jenis_dokumen === 'KONTRAK' 
        ? (payload.nama_unit_kerja || 'Kontrak') 
        : (payload.kontrak || '');

      const oldNoVerif = existing.no_verifikasi || existing.nomorVerifikasi || '';
      const newNoVerif = payload.no_verifikasi || oldNoVerif;

      if (oldNoVerif) {
        await db.query(`
          UPDATE transaksi_spm SET
            rekanan = ?,
            verifikasi_tanggal = ?,
            verifikasi_nomor = ?,
            verifikasi_nilai = ?,
            spm_nilai = ?,
            keterangan = ?,
            tipe = ?,
            kontrak = ?,
            nomor_akun = ?,
            kro = ?,
            kegiatan = ?
          WHERE verifikasi_nomor = ?
        `, [
          payload.nama_rekanan || payload.nama_pelaksana || payload.rekanan || '-',
          payload.tanggal_verifikasi || new Date().toISOString().split('T')[0],
          newNoVerif,
          cleanNilai,
          cleanNilai,
          payload.nama_kegiatan || payload.keterangan || '-',
          displayTipe,
          displayKontrak,
          payload.akun || payload.nomor_akun || '',
          payload.kw_no || payload.kro || '',
          payload.nama_kegiatan || payload.kegiatan || payload.keterangan || '-',
          oldNoVerif
        ]);
      }
    } catch (spmErr) {
      console.warn('Gagal sync update ke transaksi_spm:', spmErr.message);
    }

    const username = req.user ? req.user.username : 'System';
    await insertLog(
      username,
      'EDIT',
      'Form Verifikasi',
      `Mengubah Form Verifikasi ID: ${id} - No. ${payload.no_verifikasi || id}`
    );

    res.status(200).json({
      status: 'success',
      message: 'Formulir verifikasi berhasil diperbarui.'
    });
  } catch (err) {
    console.error('Error updating form verifikasi:', err);
    res.status(500).json({
      status: 'error',
      message: 'Gagal memperbarui formulir verifikasi: ' + err.message
    });
  }
};

const deleteVerifikasi = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await verifikasiModel.deleteVerifikasi(id);
    if (affected === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Form verifikasi tidak ditemukan.'
      });
    }

    const username = req.user ? req.user.username : 'System';
    await insertLog(
      username,
      'HAPUS',
      'Form Verifikasi',
      `Menghapus Form Verifikasi ID: ${id}`
    );

    res.status(200).json({
      status: 'success',
      message: 'Formulir verifikasi berhasil dihapus.'
    });
  } catch (err) {
    console.error('Error deleting form verifikasi:', err);
    res.status(500).json({
      status: 'error',
      message: 'Gagal menghapus formulir verifikasi.'
    });
  }
};

module.exports = {
  getVerifikasi,
  getVerifikasiById,
  createVerifikasi,
  updateVerifikasi,
  deleteVerifikasi
};
