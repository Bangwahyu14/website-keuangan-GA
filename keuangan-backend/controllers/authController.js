const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const qrcode = require('qrcode')
const speakeasy = require('speakeasy')
const userModel = require('../models/userModel')

const SECRET_KEY = 'rahasia_negara'

const login = async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ status: 'error', message: 'Username dan Password wajib diisi!' })
    }

    // Lookup user in database
    const user = await userModel.getUserByUsername(username)

    if (user) {
      const isMatch = await bcrypt.compare(password, user.password)
      if (isMatch) {
        // 1. Force Password Change check for first-time login
        if (Number(user.is_password_changed) === 0 || user.is_password_changed === false || user.is_password_changed === null) {
          return res.status(200).json({
            status: 'PASSWORD_CHANGE_REQUIRED',
            message: 'Ubah password pertama kali diperlukan',
            userId: user.id
          })
        }

        // 2. Existing 2FA Check
        if (Number(user.two_factor_enabled) === 1 || user.two_factor_enabled === true) {
          return res.status(200).json({
            status: '2FA_REQUIRED',
            message: 'Otentikasi 2FA diperlukan',
            userId: user.id
          })
        }

        // 3. First-Time 2FA Setup Required
        return res.status(200).json({
          status: '2FA_SETUP_REQUIRED',
          message: 'Registrasi 2FA pertama kali diperlukan',
          userId: user.id
        })
      }
    }

    return res.status(401).json({ status: 'error', message: 'Username atau Password salah!' })
  } catch (err) {
    console.error('Error during login:', err)
    return res.status(500).json({ status: 'error', message: err.message })
  }
}

const initChangePassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body

    if (!userId || !newPassword) {
      return res.status(400).json({ status: 'error', message: 'User ID dan Password Baru wajib diisi!' })
    }

    if (String(newPassword).trim().length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password baru minimal harus 6 karakter!' })
    }

    const userBefore = await userModel.getUserById(userId)
    if (!userBefore) {
      return res.status(404).json({ status: 'error', message: 'User tidak ditemukan!' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await userModel.changeUserPassword(userId, hashedPassword)

    // Re-fetch user to evaluate 2FA status after password update
    const user = await userModel.getUserById(userId)

    if (Number(user.two_factor_enabled) === 1 || user.two_factor_enabled === true) {
      return res.status(200).json({
        status: '2FA_REQUIRED',
        message: 'Password berhasil diubah. Silakan verifikasi 2FA.',
        userId: user.id
      })
    } else {
      return res.status(200).json({
        status: '2FA_SETUP_REQUIRED',
        message: 'Password berhasil diubah. Silakan lakukan setup 2FA.',
        userId: user.id
      })
    }
  } catch (err) {
    console.error('Error in initChangePassword:', err)
    return res.status(500).json({ status: 'error', message: 'Gagal mengubah password: ' + err.message })
  }
}

const verify2FA = async (req, res) => {
  try {
    const { userId, tempUserId, otp, code } = req.body
    const targetUserId = userId || tempUserId
    const inputOtp = otp || code

    if (!targetUserId || !inputOtp) {
      return res.status(400).json({ status: 'error', message: 'User ID dan Kode OTP wajib diisi!' })
    }

    const user = await userModel.getUserById(targetUserId)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User tidak ditemukan!' })
    }

    let isValidOtp = false
    if (user.two_factor_secret) {
      isValidOtp = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: String(inputOtp).trim(),
        window: 1
      })
    } else {
      isValidOtp = String(inputOtp).trim().length === 6
    }

    if (!isValidOtp) {
      return res.status(401).json({ status: 'error', message: 'Kode OTP 2FA tidak valid atau kadaluwarsa!' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, nama: user.nama },
      SECRET_KEY,
      { expiresIn: '8h' }
    )

    return res.status(200).json({
      status: 'success',
      message: 'Verifikasi 2FA berhasil',
      token: token,
      role: user.role,
      username: user.username,
      nama: user.nama
    })
  } catch (err) {
    console.error('Error verifying 2FA:', err)
    return res.status(500).json({ status: 'error', message: err.message })
  }
}

const generate2FA = async (req, res) => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User tidak terautentikasi.' })
    }

    const username = user.username || user.nama || 'User'
    const secret = speakeasy.generateSecret({ name: 'FinFlow (' + username + ')' })
    const qrCode = await qrcode.toDataURL(secret.otpauth_url)

    return res.status(200).json({
      status: 'success',
      secret: secret.base32,
      qrCode: qrCode
    })
  } catch (err) {
    console.error('Error generating 2FA QR code:', err)
    return res.status(500).json({ status: 'error', message: 'Gagal membuat QR Code 2FA: ' + err.message })
  }
}

const confirm2FA = async (req, res) => {
  try {
    const { otp, secret } = req.body
    const userId = req.user ? req.user.id : null

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'User tidak terautentikasi.' })
    }

    if (!otp || !secret) {
      return res.status(400).json({ status: 'error', message: 'Kode OTP dan Secret 2FA wajib diisi!' })
    }

    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: String(otp).trim(),
      window: 1
    })

    if (!isValid) {
      return res.status(400).json({ status: 'error', message: 'Kode OTP yang Anda masukkan salah atau kadaluwarsa!' })
    }

    await userModel.enableUser2FA(userId, secret)

    return res.status(200).json({
      status: 'success',
      message: '2FA berhasil diaktifkan!'
    })
  } catch (err) {
    console.error('Error confirming 2FA:', err)
    return res.status(500).json({ status: 'error', message: 'Gagal mengonfirmasi 2FA: ' + err.message })
  }
}

const initSetup2FA = async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'User ID wajib diisi!' })
    }

    const user = await userModel.getUserById(userId)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User tidak ditemukan!' })
    }

    if (Number(user.two_factor_enabled) === 1 || user.two_factor_enabled === true) {
      return res.status(400).json({ status: 'error', message: '2FA sudah aktif pada akun ini.' })
    }

    const username = user.username || user.nama || 'User'
    const secret = speakeasy.generateSecret({ name: 'FinFlow (' + username + ')' })
    const qrCode = await qrcode.toDataURL(secret.otpauth_url)

    return res.status(200).json({
      status: 'success',
      secret: secret.base32,
      qrCode: qrCode
    })
  } catch (err) {
    console.error('Error in initSetup2FA:', err)
    return res.status(500).json({ status: 'error', message: 'Gagal membuat setup 2FA: ' + err.message })
  }
}

const initConfirm2FA = async (req, res) => {
  try {
    const { userId, secret, otp } = req.body
    if (!userId || !secret || !otp) {
      return res.status(400).json({ status: 'error', message: 'User ID, Secret, dan Kode OTP wajib diisi!' })
    }

    const user = await userModel.getUserById(userId)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User tidak ditemukan!' })
    }

    if (Number(user.two_factor_enabled) === 1 || user.two_factor_enabled === true) {
      return res.status(400).json({ status: 'error', message: '2FA sudah aktif pada akun ini.' })
    }

    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: String(otp).trim(),
      window: 1
    })

    if (!isValid) {
      return res.status(400).json({ status: 'error', message: 'Kode OTP 2FA tidak valid atau kadaluwarsa!' })
    }

    await userModel.enableUser2FA(userId, secret)

    // Issue final JWT token after successful setup & verification
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, nama: user.nama },
      SECRET_KEY,
      { expiresIn: '8h' }
    )

    return res.status(200).json({
      status: 'success',
      message: 'Setup 2FA berhasil dan login berhasil!',
      token: token,
      role: user.role,
      username: user.username,
      nama: user.nama
    })
  } catch (err) {
    console.error('Error in initConfirm2FA:', err)
    return res.status(500).json({ status: 'error', message: 'Gagal mengonfirmasi setup 2FA: ' + err.message })
  }
}

module.exports = {
  login,
  initChangePassword,
  verify2FA,
  generate2FA,
  confirm2FA,
  initSetup2FA,
  initConfirm2FA
}