const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const { verifyToken, requireSuperAdmin } = require('../middlewares/authMiddleware')

// All User Management endpoints are protected and ONLY accessible by Super Admin
router.use(verifyToken)
router.use(requireSuperAdmin)

router.get('/', userController.getUsers)
router.post('/', userController.createUser)
router.put('/:id', userController.updateUser)
router.delete('/:id', userController.deleteUser)

module.exports = router
