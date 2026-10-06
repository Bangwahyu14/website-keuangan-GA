const express = require('express');
const router = express.Router();
const { login, verify2FA, generate2FA, confirm2FA, initSetup2FA, initConfirm2FA, initChangePassword } = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Endpoint: POST /api/auth/login
router.post('/login', login);

// Endpoint: POST /api/auth/init-change-password (Public pre-login force password change)
router.post('/init-change-password', initChangePassword);

// Endpoint: POST /api/auth/verify-2fa
router.post('/verify-2fa', verify2FA);

// Endpoint: POST /api/auth/init-setup-2fa (Public pre-login 2FA setup)
router.post('/init-setup-2fa', initSetup2FA);

// Endpoint: POST /api/auth/init-confirm-2fa (Public pre-login 2FA confirm)
router.post('/init-confirm-2fa', initConfirm2FA);

// Endpoint: POST /api/auth/setup-2fa (Protected via JWT)
router.post('/setup-2fa', verifyToken, generate2FA);

// Endpoint: POST /api/auth/confirm-2fa (Protected via JWT)
router.post('/confirm-2fa', verifyToken, confirm2FA);

module.exports = router;