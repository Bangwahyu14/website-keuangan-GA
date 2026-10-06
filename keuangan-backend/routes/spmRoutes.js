const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { createData, getData, updateData, deleteData, importExcel } = require('../controllers/spmController');
const { verifyToken, requireFinancialAccess, requireFinancialWrite } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', requireFinancialAccess, getData);
router.post('/', requireFinancialWrite, createData);
router.post('/import', requireFinancialWrite, upload.single('file'), importExcel);
router.put('/:id', requireFinancialWrite, updateData);
router.delete('/:id', requireFinancialWrite, deleteData);

module.exports = router;