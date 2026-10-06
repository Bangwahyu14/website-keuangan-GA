const db = require('../config/database');
const { insertLog } = require('../models/logModel');

const getRealisasiSubbagian = async (req, res) => {
    try {
        const targetTahun = parseInt(req.query.tahun) || new Date().getFullYear();
        const [rows] = await db.query(`
            SELECT 
                m.id, m.uraian AS nama_subbagian, m.pagu AS pagu_anggaran,
                COALESCE(SUM(t.sp2d_nilai), 0) AS total_realisasi,
                (m.pagu - COALESCE(SUM(t.sp2d_nilai), 0)) AS sisa_anggaran
            FROM master_anggaran m
            LEFT JOIN transaksi_spm t ON m.uraian = t.kegiatan 
              AND (
                (t.sp2d_tanggal IS NOT NULL AND t.sp2d_tanggal != '0000-00-00' AND YEAR(t.sp2d_tanggal) = ?) OR
                (t.tahun = ?) OR
                (YEAR(t.created_at) = ?)
              )
            WHERE m.level = 'Detail'
            GROUP BY m.id, m.uraian, m.pagu
        `, [targetTahun, targetTahun, targetTahun]);
        res.status(200).json({ status: "success", data: rows });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

// =========================================================================
// MENGHITUNG REALISASI HIERARKI (PROGRAM s/d DETAIL)
// =========================================================================
const getRealisasiHierarki = async (req, res) => {
    try {
        const targetTahun = parseInt(req.query.tahun) || new Date().getFullYear();
        const [budgets] = await db.query('SELECT id, kode, uraian, level, pagu FROM master_anggaran ORDER BY id ASC');
        const [spms] = await db.query(`
            SELECT kegiatan, proses, sp2d_tanggal, sp2d_nilai, verifikasi_nilai, spm_tanggal, spm_nilai, verifikasi_tanggal 
            FROM transaksi_spm
            WHERE 
                (sp2d_tanggal IS NOT NULL AND sp2d_tanggal != '0000-00-00' AND YEAR(sp2d_tanggal) = ?) OR
                (tahun = ?) OR
                (YEAR(created_at) = ?)
        `, [targetTahun, targetTahun, targetTahun]);

        let dataAnggaran = budgets.map(b => ({
            ...b,
            bulanan: Array(12).fill(0),
            total_realisasi: 0
        }));

        spms.forEach(spm => {
            const leafNode = dataAnggaran.find(m => m.uraian === spm.kegiatan);
            if (leafNode) {
                const nominal = Number(spm.sp2d_nilai) || Number(spm.spm_nilai) || Number(spm.verifikasi_nilai) || 0;
                let bulanEfektif = null;
                const statusProses = spm.status_proses || spm.proses || '';

                if ((statusProses === 'Selesai' || statusProses.toLowerCase() === 'selesai') && spm.sp2d_tanggal) {
                    bulanEfektif = new Date(spm.sp2d_tanggal).getMonth();
                } else if (spm.spm_tanggal) {
                    bulanEfektif = new Date(spm.spm_tanggal).getMonth();
                } else if (spm.verifikasi_tanggal) {
                    bulanEfektif = new Date(spm.verifikasi_tanggal).getMonth();
                }

                if (bulanEfektif !== null && bulanEfektif >= 0 && bulanEfektif <= 11) {
                    leafNode.bulanan[bulanEfektif] += nominal;
                    leafNode.total_realisasi += nominal;
                }
            }
        });

        const hierarki = [
            "Program", "Kegiatan", "KRO", "RO",
            "Komponen", "Subkomponen", "Akun", "Detail"
        ];

        for (let i = dataAnggaran.length - 1; i >= 0; i--) {
            let currentItem = dataAnggaran[i];
            let currentLevelIndex = hierarki.indexOf(currentItem.level);

            if (currentLevelIndex > 0) {
                let parentLevelName = hierarki[currentLevelIndex - 1];

                for (let j = i - 1; j >= 0; j--) {
                    if (dataAnggaran[j].level === parentLevelName) {
                        for (let b = 0; b < 12; b++) {
                            dataAnggaran[j].bulanan[b] += currentItem.bulanan[b];
                        }
                        dataAnggaran[j].total_realisasi += currentItem.total_realisasi;
                        break;
                    }
                }
            }
        }

        res.status(200).json({ status: "success", data: dataAnggaran });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

// --- LOGIKA HALAMAN ANALISIS REALISASI ---
const getAnalisaRealisasi = async (req, res) => {
    try {
        const targetTahun = parseInt(req.query.tahun) || new Date().getFullYear();
        const [jenisRows] = await db.query('SELECT * FROM master_jenis_belanja ORDER BY kode ASC');
        const [spms] = await db.query(`
            SELECT nomor_akun, proses, sp2d_tanggal, sp2d_nilai, verifikasi_nilai, spm_tanggal, spm_nilai, verifikasi_tanggal 
            FROM transaksi_spm
            WHERE 
              (LOWER(proses) = 'selesai' OR LOWER(proses) LIKE '%sp2d%' OR LOWER(proses) LIKE '%cair%')
              AND (
                (sp2d_tanggal IS NOT NULL AND sp2d_tanggal != '0000-00-00' AND YEAR(sp2d_tanggal) = ?) OR
                (tahun = ?) OR
                (YEAR(created_at) = ?)
              )
        `, [targetTahun, targetTahun, targetTahun]);

        const [paguRows] = await db.query(`SELECT SUM(pagu) AS total_pagu FROM master_anggaran WHERE level = 'Detail'`);
        const totalPagu = parseFloat(paguRows[0]?.total_pagu) || 0;

        const [paguJenisRows] = await db.query(`
            SELECT LEFT(kode, 2) AS kode_akun, SUM(pagu) AS pagu 
            FROM master_anggaran 
            WHERE level = 'Detail' 
            GROUP BY LEFT(kode, 2)
        `);

        let dataBulanan = jenisRows.map(jb => {
            const pRow = paguJenisRows.find(p => p.kode_akun === jb.kode);
            const paguVal = parseFloat(pRow?.pagu) || 0;
            return {
                id: jb.id, 
                kode: jb.kode, 
                nama: jb.nama,
                pagu: paguVal,
                bulanan: Array(12).fill(0), 
                total: 0
            };
        });

        let totalBulananSemua = Array(12).fill(0);
        let grandTotal = 0;

        spms.forEach(spm => {
            const statusProses = (spm.status_proses || spm.proses || '').toLowerCase();
            const isFinished = statusProses.includes('selesai') || statusProses.includes('sp2d') || statusProses.includes('cair');

            // HANYA hitung dokumen yang berstatus Selesai/SP2D (Abaikan 'Menunggu', 'Proses', 'Verifikasi')
            if (!isFinished) return;

            const nominal = Number(spm.sp2d_nilai) || Number(spm.spm_nilai) || Number(spm.verifikasi_nilai) || 0;
            let bulanEfektif = null;

            if (spm.sp2d_tanggal && new Date(spm.sp2d_tanggal).toString() !== 'Invalid Date') {
                bulanEfektif = new Date(spm.sp2d_tanggal).getMonth();
            } else if (spm.spm_tanggal && new Date(spm.spm_tanggal).toString() !== 'Invalid Date') {
                bulanEfektif = new Date(spm.spm_tanggal).getMonth();
            } else if (spm.verifikasi_tanggal && new Date(spm.verifikasi_tanggal).toString() !== 'Invalid Date') {
                bulanEfektif = new Date(spm.verifikasi_tanggal).getMonth();
            } else {
                bulanEfektif = new Date().getMonth();
            }

            if (bulanEfektif !== null && bulanEfektif >= 0 && bulanEfektif <= 11) {
                if (spm.nomor_akun) {
                    const kodeAkun = spm.nomor_akun.substring(0, 2);
                    let jenis = dataBulanan.find(d => d.kode === kodeAkun);
                    if (jenis) {
                        jenis.bulanan[bulanEfektif] += nominal;
                        jenis.total += nominal;
                    }
                }
                totalBulananSemua[bulanEfektif] += nominal;
                grandTotal += nominal;
            }
        });

        let dataAkumulasi = dataBulanan.map(jb => {
            let akum = Array(12).fill(0);
            let currentSum = 0;
            for (let i = 0; i < 12; i++) {
                currentSum += jb.bulanan[i];
                akum[i] = currentSum;
            }
            return { nama: jb.nama + ' (Akumulasi)', akumulasi: akum, total: currentSum };
        });

        res.status(200).json({
            status: 'success',
            data: {
                total_pagu: totalPagu,
                bulanan: dataBulanan,
                total_per_bulan: totalBulananSemua,
                grand_total: grandTotal,
                akumulasi: dataAkumulasi
            }
        });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

const getSummaryHal3Dipa = async (req, res) => {
    try {
        const tahun = req.query.tahun ? parseInt(req.query.tahun, 10) : new Date().getFullYear();

        // 1. Ambil SEMUA data master target (termasuk kode 51, 52, 53)
        const [targetRows] = await db.query(
            `SELECT id, kode_belanja, nama_belanja, target_persen FROM master_target_dipa WHERE tahun = ? ORDER BY kode_belanja ASC`,
            [tahun]
        );

        if (targetRows.length === 0) {
            return res.status(200).json({ status: "success", data: [], total: null });
        }

        // 2. Query Total Keseluruhan Pagu (master_anggaran)
        let totalPaguQuery = `
            SELECT SUM(pagu) AS total_keseluruhan
            FROM master_anggaran
            WHERE pagu > 0 
              AND (level NOT IN ('Program', 'Kegiatan', 'KRO', 'RO', 'Komponen', 'Subkomponen'))
        `;
        const totalPaguParams = [];
        const [totalPaguRows] = await db.query(totalPaguQuery, totalPaguParams);
        const totalPaguKeseluruhan = parseFloat(totalPaguRows[0]?.total_keseluruhan) || 0;

        // 3. Query Pagu Per Jenis Belanja (Grouping 2 digit pertama dari master_anggaran)
        let paguQuery = `
            SELECT 
                LEFT(
                    CASE 
                        WHEN a.kode REGEXP '^[5][1-9]' THEN a.kode
                        WHEN p.kode REGEXP '^[5][1-9]' THEN p.kode
                        ELSE a.kode
                    END, 2
                ) AS jenis_belanja,
                SUM(a.pagu) AS total_pagu 
            FROM master_anggaran a
            LEFT JOIN master_anggaran p ON a.parent_id = p.id
            WHERE a.pagu > 0 
              AND (a.level NOT IN ('Program', 'Kegiatan', 'KRO', 'RO', 'Komponen', 'Subkomponen'))
        `;
        const paguParams = [];
        paguQuery += ` GROUP BY jenis_belanja`;
        const [paguRows] = await db.query(paguQuery, paguParams);

        // Ambil Pagu 51 dan 53 secara spesifik
        const pagu51Obj = paguRows.find(p => String(p.jenis_belanja).trim() === '51');
        const pagu53Obj = paguRows.find(p => String(p.jenis_belanja).trim() === '53');
        const pagu51 = parseFloat(pagu51Obj?.total_pagu) || 0;
        const pagu53 = parseFloat(pagu53Obj?.total_pagu) || 0;
        const pagu52 = totalPaguKeseluruhan - (pagu51 + pagu53);

        // 4. Query Realisasi: Grouping 2 digit pertama (LEFT(nomor_akun, 2)) dari transaksi_spm
        let realisasiQuery = `
            SELECT 
                LEFT(nomor_akun, 2) AS jenis_belanja,
                SUM(CASE WHEN LOWER(proses) = 'selesai' OR LOWER(proses) LIKE '%sp2d%' THEN sp2d_nilai ELSE 0 END) AS total_sp2d,
                SUM(CASE WHEN LOWER(proses) != 'selesai' AND LOWER(proses) NOT LIKE '%sp2d%' THEN verifikasi_nilai ELSE 0 END) AS total_proses
            FROM transaksi_spm 
            WHERE nomor_akun IS NOT NULL AND TRIM(nomor_akun) != '' AND TRIM(nomor_akun) != '-'
        `;
        const realisasiParams = [];
        if (tahun) {
            realisasiQuery += ` AND (tahun = ? OR YEAR(verifikasi_tanggal) = ?)`;
            realisasiParams.push(tahun, tahun);
        }
        realisasiQuery += ` GROUP BY LEFT(nomor_akun, 2)`;
        const [realisasiRows] = await db.query(realisasiQuery, realisasiParams);

        // 5. Sinkronisasi Data ke masing-masing target (51, 52, 53)
        const summaryData = targetRows.map(target => {
            const kode = String(target.kode_belanja).trim();

            let pagu = 0;
            if (kode === '52') {
                pagu = pagu52;
            } else if (kode === '51') {
                pagu = pagu51;
            } else if (kode === '53') {
                pagu = pagu53;
            } else {
                const paguObj = paguRows.find(p => String(p.jenis_belanja).trim() === kode);
                pagu = parseFloat(paguObj?.total_pagu) || 0;
            }

            const realisasiObj = realisasiRows.find(r => String(r.jenis_belanja).trim() === kode);
            const sp2d = parseFloat(realisasiObj?.total_sp2d) || 0;
            const proses = parseFloat(realisasiObj?.total_proses) || 0;

            const rawTargetPersen = parseFloat(target.target_persen) || 0;
            // Menangani jika target_persen disimpan sebagai desimal (0.20) atau persentase (20)
            const target_persentase_desimal = rawTargetPersen > 1 ? rawTargetPersen / 100 : rawTargetPersen;
            const target_nilai = pagu * target_persentase_desimal;
            const lebih_kurang = sp2d - target_nilai;

            return {
                id: target.id,
                kode_belanja: kode,
                jenis_belanja: target.nama_belanja,
                pagu: pagu,
                sp2d_nilai: sp2d,
                sp2d_persen: pagu > 0 ? (sp2d / pagu) * 100 : 0,
                proses_nilai: proses,
                proses_persen: pagu > 0 ? (proses / pagu) * 100 : 0,
                target_persen: target_persentase_desimal * 100,
                target_nilai: target_nilai,
                lebih_kurang_nilai: lebih_kurang,
                lebih_kurang_persen: target_nilai > 0 ? (lebih_kurang / target_nilai) * 100 : 0
            };
        });

        // 6. Perhitungan Objek totalRow (Mencakup 51, 52, dan 53)
        const totalPagu = summaryData.reduce((sum, item) => sum + item.pagu, 0);
        const totalSp2d = summaryData.reduce((sum, item) => sum + item.sp2d_nilai, 0);
        const totalProses = summaryData.reduce((sum, item) => sum + item.proses_nilai, 0);
        const totalTargetNilai = summaryData.reduce((sum, item) => sum + item.target_nilai, 0);
        const totalLebihKurang = summaryData.reduce((sum, item) => sum + item.lebih_kurang_nilai, 0);

        const totalRow = {
            jenis_belanja: 'TOTAL',
            pagu: totalPagu,
            sp2d_nilai: totalSp2d,
            sp2d_persen: totalPagu > 0 ? (totalSp2d / totalPagu) * 100 : 0,
            proses_nilai: totalProses,
            proses_persen: totalPagu > 0 ? (totalProses / totalPagu) * 100 : 0,
            target_persen: totalPagu > 0 ? (totalTargetNilai / totalPagu) * 100 : 0,
            target_nilai: totalTargetNilai,
            lebih_kurang_nilai: totalLebihKurang,
            lebih_kurang_persen: totalTargetNilai > 0 ? (totalLebihKurang / totalTargetNilai) * 100 : 0
        };

        return res.status(200).json({ status: "success", data: summaryData, total: totalRow });
    } catch (error) {
        console.error('Error in getSummaryHal3Dipa:', error);
        return res.status(500).json({ status: "error", message: error.message });
    }
};

const createTargetDipa = async (req, res) => {
    try {
        const { kode_belanja, nama_belanja, target_persen, tahun } = req.body;
        const persenDesimal = parseFloat(target_persen) / 100;
        const targetTahun = parseInt(tahun, 10) || new Date().getFullYear();
        await db.query(`INSERT INTO master_target_dipa (kode_belanja, nama_belanja, target_persen, tahun) VALUES (?, ?, ?, ?)`,
            [kode_belanja, nama_belanja, persenDesimal, targetTahun]);

        const username = req.user ? req.user.username : 'System';
        await insertLog(username, 'TAMBAH', 'Target Hal III DIPA', `Menambahkan target DIPA ${nama_belanja} (${target_persen}%) T.A. ${targetTahun}`);

        res.status(201).json({ status: "success" });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

const updateTargetDipa = async (req, res) => {
    try {
        const { kode_belanja, nama_belanja, target_persen, tahun } = req.body;
        const persenDesimal = parseFloat(target_persen) / 100;
        const targetTahun = parseInt(tahun, 10) || new Date().getFullYear();
        await db.query(`UPDATE master_target_dipa SET kode_belanja=?, nama_belanja=?, target_persen=?, tahun=? WHERE id=?`,
            [kode_belanja, nama_belanja, persenDesimal, targetTahun, req.params.id]);

        const username = req.user ? req.user.username : 'System';
        await insertLog(username, 'EDIT', 'Target Hal III DIPA', `Mengubah target DIPA ${nama_belanja || 'ID ' + req.params.id} menjadi ${target_persen}% T.A. ${targetTahun}`);

        res.status(200).json({ status: "success" });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

const deleteTargetDipa = async (req, res) => {
    try {
        await db.query(`DELETE FROM master_target_dipa WHERE id=?`, [req.params.id]);

        const username = req.user ? req.user.username : 'System';
        await insertLog(username, 'HAPUS', 'Target Hal III DIPA', `Menghapus target DIPA ID ${req.params.id}`);

        res.status(200).json({ status: "success" });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

const getJudulSubbagian = async (req, res) => {
    try {
        const targetTahun = parseInt(req.query.tahun) || new Date().getFullYear();
        const [judulRows] = await db.query(`SELECT id, nama_judul FROM judul_subbagian ORDER BY id ASC`);

        const [details] = await db.query(`
            SELECT id, uraian, pagu, judul_subbagian_id
            FROM master_anggaran 
            WHERE level = 'Detail' AND judul_subbagian_id IS NOT NULL
        `);

        const [spms] = await db.query(`
            SELECT kegiatan, proses, sp2d_nilai, verifikasi_nilai, spm_nilai, sp2d_tanggal, spm_tanggal, verifikasi_tanggal 
            FROM transaksi_spm
            WHERE 
              (proses = 'Selesai' AND YEAR(sp2d_tanggal) = ?) OR
              (proses != 'Selesai' AND spm_tanggal IS NOT NULL AND YEAR(spm_tanggal) = ?) OR
              (proses != 'Selesai' AND (spm_tanggal IS NULL OR YEAR(spm_tanggal) = 0) AND (verifikasi_tanggal IS NULL OR YEAR(verifikasi_tanggal) = ? OR YEAR(created_at) = ?))
        `, [targetTahun, targetTahun, targetTahun, targetTahun]);

        const detailRows = details.map(d => {
            let total_realisasi = 0;
            spms.forEach(spm => {
                if (spm.kegiatan === d.uraian) {
                    const nominal = Number(spm.sp2d_nilai) || Number(spm.spm_nilai) || Number(spm.verifikasi_nilai) || 0;
                    let bulanEfektif = null;
                    let tahunEfektif = null;
                    const statusProses = spm.status_proses || spm.proses || '';

                    if ((statusProses === 'Selesai' || statusProses.toLowerCase() === 'selesai') && spm.sp2d_tanggal) {
                        const dateObj = new Date(spm.sp2d_tanggal);
                        bulanEfektif = dateObj.getMonth();
                        tahunEfektif = dateObj.getFullYear();
                    } else if (spm.spm_tanggal) {
                        const dateObj = new Date(spm.spm_tanggal);
                        bulanEfektif = dateObj.getMonth();
                        tahunEfektif = dateObj.getFullYear();
                    } else if (spm.verifikasi_tanggal) {
                        const dateObj = new Date(spm.verifikasi_tanggal);
                        bulanEfektif = dateObj.getMonth();
                        tahunEfektif = dateObj.getFullYear();
                    }

                    if (tahunEfektif === targetTahun && bulanEfektif !== null && bulanEfektif >= 0 && bulanEfektif <= 11) {
                        total_realisasi += nominal;
                    }
                }
            });
            const paguVal = parseFloat(d.pagu) || 0;
            return {
                id: d.id,
                uraian: d.uraian,
                pagu: paguVal,
                judul_subbagian_id: d.judul_subbagian_id,
                total_realisasi
            };
        });

        const data = judulRows.map(judul => {
            const groupDetails = detailRows.filter(d => d.judul_subbagian_id === judul.id);
            let sub_pagu = 0;
            let sub_realisasi = 0;

            groupDetails.forEach(d => {
                sub_pagu += d.pagu;
                sub_realisasi += d.total_realisasi;
            });

            return {
                id: judul.id,
                nama_judul: judul.nama_judul,
                details: groupDetails.map(d => ({
                    id: d.id,
                    uraian: d.uraian,
                    pagu: d.pagu,
                    realisasi: d.total_realisasi
                })),
                subtotal_pagu: sub_pagu,
                subtotal_realisasi: sub_realisasi
            };
        });

        res.status(200).json({ status: "success", data: data });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

const createJudulSubbagian = async (req, res) => {
    try {
        const { nama_judul } = req.body;
        await db.query(`INSERT INTO judul_subbagian (nama_judul) VALUES (?)`, [nama_judul]);

        const username = req.user ? req.user.username : 'System';
        await insertLog(username, 'TAMBAH', 'Realisasi Subbagian', `Menambahkan judul subbagian ${nama_judul}`);

        res.status(201).json({ status: "success" });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

const updateJudulSubbagian = async (req, res) => {
    try {
        const { nama_judul } = req.body;
        await db.query(`UPDATE judul_subbagian SET nama_judul=? WHERE id=?`, [nama_judul, req.params.id]);

        const username = req.user ? req.user.username : 'System';
        await insertLog(username, 'EDIT', 'Realisasi Subbagian', `Mengubah nama subbagian ID ${req.params.id} menjadi ${nama_judul}`);

        res.status(200).json({ status: "success" });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

const deleteJudulSubbagian = async (req, res) => {
    try {
        await db.query(`DELETE FROM judul_subbagian WHERE id=?`, [req.params.id]);

        const username = req.user ? req.user.username : 'System';
        await insertLog(username, 'HAPUS', 'Realisasi Subbagian', `Menghapus subbagian ID ${req.params.id}`);

        res.status(200).json({ status: "success" });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

const getJenisBelanja = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM master_jenis_belanja ORDER BY kode ASC`);
        res.status(200).json({ status: "success", data: rows });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

const createJenisBelanja = async (req, res) => {
    try {
        const { kode, nama } = req.body;
        await db.query(`INSERT INTO master_jenis_belanja (kode, nama) VALUES (?, ?)`, [kode, nama]);
        res.status(201).json({ status: "success" });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

const updateJenisBelanja = async (req, res) => {
    try {
        const { kode, nama } = req.body;
        await db.query(`UPDATE master_jenis_belanja SET kode=?, nama=? WHERE id=?`, [kode, nama, req.params.id]);
        res.status(200).json({ status: "success" });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

const deleteJenisBelanja = async (req, res) => {
    try {
        await db.query(`DELETE FROM master_jenis_belanja WHERE id=?`, [req.params.id]);
        res.status(200).json({ status: "success" });
    } catch (error) { res.status(500).json({ status: "error", message: error.message }); }
};

module.exports = {
    getRealisasiSubbagian, getRealisasiHierarki, getAnalisaRealisasi, getSummaryHal3Dipa,
    createTargetDipa, updateTargetDipa, deleteTargetDipa,
    getJudulSubbagian, createJudulSubbagian, updateJudulSubbagian, deleteJudulSubbagian,
    getJenisBelanja, createJenisBelanja, updateJenisBelanja, deleteJenisBelanja
};