const spmModel = require('../models/spmModel');
const { insertLog } = require('../models/logModel');

const createData = async (req, res) => {
    try {
        const result = await spmModel.createSpm(req.body);
        const username = req.user ? req.user.username : 'System';
        const detailRekan = req.body.rekanan ? ` (Rekanan: ${req.body.rekanan})` : '';
        await insertLog(username, 'TAMBAH', 'Rincian SPM', `Menambahkan data SPM baru${detailRekan}`);

        res.status(201).json({ status: "success", message: "Data SPM berhasil ditambahkan!", dataId: result.insertId });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

const getData = async (req, res) => {
    try {
        const tahun = req.query.tahun;
        let data;
        if (tahun) {
            data = await spmModel.getSpmByTahun(tahun);
        } else {
            data = await spmModel.getAllSpm();
        }
        res.status(200).json({ status: "success", data: data });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

const updateData = async (req, res) => {
    try {
        const id = req.params.id;

        const currentSpm = await spmModel.getSpmById(id);
        if (!currentSpm) {
            return res.status(404).json({ status: "error", message: "Data SPM tidak ditemukan" });
        }

        await spmModel.updateSpm(id, req.body);

        const username = req.user ? req.user.username : 'System';
        await insertLog(username, 'EDIT', 'Rincian SPM', `Mengubah data SPM ID ${id} (Rekanan: ${currentSpm.rekanan || '-'})`);

        res.status(200).json({ status: "success", message: "Data SPM berhasil diperbarui!" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

const deleteData = async (req, res) => {
    try {
        const id = req.params.id;
        await spmModel.deleteSpm(id);

        const username = req.user ? req.user.username : 'System';
        await insertLog(username, 'HAPUS', 'Rincian SPM', `Menghapus data SPM ID ${id}`);

        res.status(200).json({ status: "success", message: "Data SPM berhasil dihapus!" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

const XLSX = require('xlsx');

const importExcel = async (req, res) => {
    try {
        const fileBuffer = req.file ? req.file.buffer : (req.files && req.files[0] ? req.files[0].buffer : null);
        if (!fileBuffer) {
            return res.status(400).json({ status: "error", message: "File Excel wajib diunggah!" });
        }

        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // 1. Baca sebagai Array 2D sementara untuk mencari letak baris Header
        const rawArray = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        let headerRowIndex = -1;

        for (let i = 0; i < rawArray.length; i++) {
            const rowStr = (rawArray[i] || []).map(cell => String(cell || '').toUpperCase()).join('');
            // HANYA gunakan INVOICE sebagai patokan agar tidak tertipu judul laporan ("Daftar SP2D...")
            if (rowStr.includes('INVOICE')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            return res.status(400).json({ status: "error", message: "Gagal menemukan kolom INVOICE atau SP2D di Excel." });
        }

        // 2. Konversi ulang ke JSON secara akurat dengan melewati baris kosong di atasnya
        const excelData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });

        if (!Array.isArray(excelData) || excelData.length === 0) {
            return res.status(400).json({ status: "error", message: "Data Excel kosong di bawah header!" });
        }

        let updatedCount = 0;

        for (const row of excelData) {
            // Normalisasi kunci objek (hapus spasi, uppercase) agar kebal typo
            const normalizedRow = {};
            for (const key in row) {
                const cleanKey = String(key).toUpperCase().replace(/[^A-Z0-9]/g, '');
                normalizedRow[cleanKey] = row[key];
            }

            // Cari kolom Invoice
            const invoiceKey = Object.keys(normalizedRow).find(k => k.includes('INVOICE'));
            if (!invoiceKey || !normalizedRow[invoiceKey]) continue;

            const rawInvoice = String(normalizedRow[invoiceKey]).trim();
            const extractedSPM = rawInvoice.substring(0, 5).trim();
            if (!extractedSPM) continue;

            // Cari kolom SP2D
            const noSp2dKey = Object.keys(normalizedRow).find(k => k.includes('SP2D') && (k.includes('NO') || k.includes('NOMOR')));
            const tglSp2dKey = Object.keys(normalizedRow).find(k => k.includes('SP2D') && (k.includes('TGL') || k.includes('TANGGAL') || k.includes('T')));

            const rawNoSp2d = noSp2dKey ? normalizedRow[noSp2dKey] : '';
            const rawTglSp2d = tglSp2dKey ? normalizedRow[tglSp2dKey] : '';

            const sp2dNomor = String(rawNoSp2d || '').trim();

            let sp2dTanggal = null;
            if (rawTglSp2d) {
                if (typeof rawTglSp2d === 'number') {
                    const parsed = XLSX.SSF.parse_date_code(rawTglSp2d);
                    if (parsed) {
                        sp2dTanggal = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
                    }
                } else if (rawTglSp2d instanceof Date) {
                    sp2dTanggal = rawTglSp2d.toISOString().split('T')[0];
                } else {
                    const strDate = String(rawTglSp2d).trim();
                    if (/^\d{4}-\d{2}-\d{2}$/.test(strDate)) {
                        sp2dTanggal = strDate;
                    } else if (strDate.includes('/')) {
                        const parts = strDate.split('/');
                        if (parts.length === 3 && parts[2].length === 4) {
                            sp2dTanggal = `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
                        }
                    } else if (strDate.includes('-')) {
                        const parts = strDate.split('-');
                        if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
                            sp2dTanggal = `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
                        } else {
                            sp2dTanggal = strDate;
                        }
                    } else {
                        sp2dTanggal = strDate;
                    }
                }
            }

            // Execute SQL update (Pastikan model spmModel.updateSp2dDataBySpm menggunakan TRIM())
            const result = await spmModel.updateSp2dDataBySpm(extractedSPM, sp2dTanggal, sp2dNomor);
            if (result && result.affectedRows > 0) {
                updatedCount += result.affectedRows;
            }
        }

        const username = req.user ? req.user.username : 'System';
        await insertLog(username, 'IMPORT', 'Rincian SPM', `Mengimpor data SP2D dari Excel (${updatedCount} data diperbarui)`);

        res.status(200).json({ 
            status: "success", 
            message: `Berhasil mengimpor data Excel! ${updatedCount} data SP2D telah diperbarui.`,
            updatedCount 
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

module.exports = { createData, getData, updateData, deleteData, importExcel };