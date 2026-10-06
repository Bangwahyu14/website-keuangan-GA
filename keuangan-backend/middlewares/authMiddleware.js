const jwt = require('jsonwebtoken')
const SECRET_KEY = 'rahasia_negara'

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization']
  if (!authHeader) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak. Token tidak ditemukan!' })
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader
  try {
    const decoded = jwt.verify(token, SECRET_KEY)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Token tidak valid atau telah kedaluwarsa!' })
  }
}

// Guard Middleware: ONLY Super Admin allowed
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ 
      status: 'error', 
      message: 'Akses ditolak! Halaman dan operasi ini hanya diperuntukkan untuk Super Admin.' 
    })
  }
  next()
}

// Guard Middleware: Allows Super Admin, Admin, User, & Verifikator to view financial data
const requireFinancialAccess = (req, res, next) => {
  const allowedRoles = ['superadmin', 'super_admin', 'admin', 'user', 'verifikator']
  if (!req.user || !allowedRoles.includes((req.user.role || '').toLowerCase().trim())) {
    return res.status(403).json({ 
      status: 'error', 
      message: 'Akses ditolak! Data keuangan hanya dapat diakses oleh role yang berhak.' 
    })
  }
  next()
}

// Guard Middleware: Allowed Admin, Verifikator, & Super Admin to mutate (create/edit/delete) financial data
const requireFinancialWrite = (req, res, next) => {
  const allowedRoles = ['admin', 'verifikator', 'superadmin', 'super_admin'];
  const userRole = (req.user?.role || '').toLowerCase().trim();

  if (!req.user || !allowedRoles.includes(userRole)) {
    return res.status(403).json({ 
      status: 'error', 
      message: 'Akses ditolak! Operasi mutasi data keuangan hanya diperuntukkan bagi pengguna berwenang (Admin/Verifikator).' 
    })
  }
  next()
}

module.exports = {
  verifyToken,
  requireSuperAdmin,
  requireAdmin: requireFinancialWrite,
  requireFinancialAccess,
  requireFinancialWrite
}
