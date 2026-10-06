const userModel = require('../models/userModel')
const { insertLog } = require('../models/logModel')

const getUsers = async (req, res) => {
  try {
    const users = await userModel.getAllUsers()
    res.status(200).json({ status: 'success', data: users })
  } catch (err) {
    console.error('Error fetching users:', err)
    res.status(500).json({ status: 'error', message: err.message })
  }
}

const createUser = async (req, res) => {
  try {
    const { nama, nama_lengkap, username, password, role } = req.body
    const finalNama = (nama_lengkap || nama || '').trim()

    if (!finalNama || !username || !password) {
      return res.status(400).json({ status: 'error', message: 'Nama Lengkap, Username, dan Password wajib diisi!' })
    }

    const existingUser = await userModel.getUserByUsername(username)
    if (existingUser) {
      return res.status(400).json({ status: 'error', message: 'Username sudah terdaftar! Gunakan username lain.' })
    }

    const result = await userModel.createUser({ nama: finalNama, username: username.trim(), password, role })

    const activeUser = req.user ? req.user.username : 'Super Admin'
    await insertLog(activeUser, 'TAMBAH', 'Manajemen User', `Menambahkan pengguna baru ${username.trim()} (Role: ${role || 'admin'})`)

    res.status(201).json({ status: 'success', message: 'Pengguna baru berhasil ditambahkan!', dataId: result.insertId })
  } catch (err) {
    console.error('Error creating user:', err)
    res.status(500).json({ status: 'error', message: err.message })
  }
}

const updateUser = async (req, res) => {
  try {
    const id = req.params.id
    const { nama, nama_lengkap, username, password, role } = req.body
    const finalNama = (nama_lengkap || nama || '').trim()

    if (!finalNama || !username) {
      return res.status(400).json({ status: 'error', message: 'Nama Lengkap dan Username wajib diisi!' })
    }

    const existingUser = await userModel.getUserByUsername(username)
    if (existingUser && existingUser.id !== parseInt(id)) {
      return res.status(400).json({ status: 'error', message: 'Username sudah digunakan pengguna lain!' })
    }

    await userModel.updateUser(id, { nama: finalNama, username: username.trim(), password, role })

    const activeUser = req.user ? req.user.username : 'Super Admin'
    await insertLog(activeUser, 'EDIT', 'Manajemen User', `Mengubah data pengguna ${username.trim()} (Role: ${role})`)

    res.status(200).json({ status: 'success', message: 'Data pengguna berhasil diperbarui!' })
  } catch (err) {
    console.error('Error updating user:', err)
    res.status(500).json({ status: 'error', message: err.message })
  }
}

const deleteUser = async (req, res) => {
  try {
    const id = req.params.id

    // Prevent Super Admin from deleting their own logged-in account
    if (req.user && req.user.id === parseInt(id)) {
      return res.status(400).json({ status: 'error', message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!' })
    }

    await userModel.deleteUser(id)

    const activeUser = req.user ? req.user.username : 'Super Admin'
    await insertLog(activeUser, 'HAPUS', 'Manajemen User', `Menghapus akun pengguna ID ${id}`)

    res.status(200).json({ status: 'success', message: 'Pengguna berhasil dihapus!' })
  } catch (err) {
    console.error('Error deleting user:', err)
    res.status(500).json({ status: 'error', message: err.message })
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
}
