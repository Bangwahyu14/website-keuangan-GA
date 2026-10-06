const express = require('express');
const router = express.Router();
const verifikasiController = require('../controllers/verifikasiController');
const { verifyToken, requireFinancialAccess, requireFinancialWrite } = require('../middlewares/authMiddleware');

// Protected Routes (JWT required)
router.use(verifyToken);

router.get('/', requireFinancialAccess, verifikasiController.getVerifikasi);
router.get('/:id', requireFinancialAccess, verifikasiController.getVerifikasiById);
router.post('/', requireFinancialWrite, verifikasiController.createVerifikasi);
router.put('/:id', requireFinancialWrite, verifikasiController.updateVerifikasi);
router.delete('/:id', requireFinancialWrite, verifikasiController.deleteVerifikasi);

module.exports = router;
