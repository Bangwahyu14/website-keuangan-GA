const express = require('express');
const router = express.Router();
const { 
    createData, getData, updateData, deleteData,
    getKRO, getRO, getAkun, getKegiatan 
} = require('../controllers/anggaranController');
const { verifyToken, requireFinancialAccess, requireFinancialWrite } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// ROUTE DROPDOWN (Read-only for Admin & User)
router.get('/kro', requireFinancialAccess, getKRO);
router.get('/ro', requireFinancialAccess, getRO);
router.get('/akun', requireFinancialAccess, getAkun);
router.get('/kegiatan', requireFinancialAccess, getKegiatan);

// ROUTE UTAMA
router.get('/', requireFinancialAccess, getData);
router.post('/', requireFinancialWrite, createData);
router.put('/:id', requireFinancialWrite, updateData);
router.delete('/:id', requireFinancialWrite, deleteData);

module.exports = router;