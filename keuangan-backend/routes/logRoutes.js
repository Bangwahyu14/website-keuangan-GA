const express = require('express')
const router = express.Router()
const logController = require('../controllers/logController')
const { verifyToken, requireSuperAdmin } = require('../middlewares/authMiddleware')

// Protect all log routes with Super Admin check
router.use(verifyToken)
router.use(requireSuperAdmin)

router.get('/', logController.getLogs)

module.exports = router
