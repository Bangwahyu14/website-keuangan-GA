const express = require('express');
const router = express.Router();
const realisasiController = require('../controllers/realisasiController');
const { verifyToken, requireFinancialAccess, requireFinancialWrite } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// Route Tarik Data (Read-only for Admin & User)
router.get('/subbagian', requireFinancialAccess, realisasiController.getRealisasiSubbagian);
router.get('/analisa', requireFinancialAccess, realisasiController.getAnalisaRealisasi);
router.get('/hal3-dipa', requireFinancialAccess, realisasiController.getSummaryHal3Dipa);
router.get('/hierarki', requireFinancialAccess, realisasiController.getRealisasiHierarki); 
router.get('/subbagian-judul', requireFinancialAccess, realisasiController.getJudulSubbagian);
router.get('/jenis-belanja', requireFinancialAccess, realisasiController.getJenisBelanja);

// Route Write/Mutation Target DIPA (Admin ONLY)
router.post('/hal3-dipa', requireFinancialWrite, realisasiController.createTargetDipa);
router.put('/hal3-dipa/:id', requireFinancialWrite, realisasiController.updateTargetDipa);
router.delete('/hal3-dipa/:id', requireFinancialWrite, realisasiController.deleteTargetDipa);

// Route Write/Mutation Judul Subbagian (Admin ONLY)
router.post('/subbagian-judul', requireFinancialWrite, realisasiController.createJudulSubbagian);
router.put('/subbagian-judul/:id', requireFinancialWrite, realisasiController.updateJudulSubbagian);
router.delete('/subbagian-judul/:id', requireFinancialWrite, realisasiController.deleteJudulSubbagian);

// Route Write/Mutation Master Jenis Belanja (Admin ONLY)
router.post('/jenis-belanja', requireFinancialWrite, realisasiController.createJenisBelanja);
router.put('/jenis-belanja/:id', requireFinancialWrite, realisasiController.updateJenisBelanja);
router.delete('/jenis-belanja/:id', requireFinancialWrite, realisasiController.deleteJenisBelanja);

module.exports = router;