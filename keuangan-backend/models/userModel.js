const db = require('../config/database')
const bcrypt = require('bcrypt')

// Initialize Users Table and Seed Default Accounts
const initUserTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('superadmin', 'admin', 'user', 'verifikator') NOT NULL DEFAULT 'user',
        is_password_changed TINYINT DEFAULT 0,
        two_factor_secret VARCHAR(255) NULL,
        two_factor_enabled TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `
    await db.query(createTableQuery)

    // Alter column to ensure 'verifikator' role is supported in existing MySQL databases
    try {
      await db.query("ALTER TABLE users MODIFY COLUMN role ENUM('superadmin', 'admin', 'user', 'verifikator') NOT NULL DEFAULT 'user';")
    } catch (e) {
      // Ignore if column is already updated
    }

    // Alter column for is_password_changed if missing in existing databases
    try {
      await db.query("ALTER TABLE users ADD COLUMN is_password_changed TINYINT DEFAULT 0;")
    } catch (e) {
      // Ignore if column already exists
    }

    // Check if table is empty
    const [rows] = await db.query('SELECT COUNT(*) as count FROM users')
    if (rows[0].count === 0) {
      console.log('Seeding initial Super Admin, Admin, User, and Verifikator accounts...')
      const hashedSuper = await bcrypt.hash('super123', 10)
      const hashedAdmin = await bcrypt.hash('admin123', 10)
      const hashedUser = await bcrypt.hash('user123', 10)
      const hashedVerifikator = await bcrypt.hash('verifikator123', 10)

      await db.query(`
        INSERT INTO users (nama, username, password, role) VALUES 
        ('Super Admin Utama', 'superadmin', ?, 'superadmin'),
        ('Admin Keuangan Operasional', 'admin', ?, 'admin'),
        ('User Staf Keuangan', 'user', ?, 'user'),
        ('Verifikator Keuangan', 'verifikator', ?, 'verifikator')
      `, [hashedSuper, hashedAdmin, hashedUser, hashedVerifikator])
    } else {
      // Ensure default 'verifikator' account exists if missing
      const [verifRows] = await db.query("SELECT id FROM users WHERE username = 'verifikator'")
      if (verifRows.length === 0) {
        console.log('Seeding missing Verifikator account...')
        const hashedVerifikator = await bcrypt.hash('verifikator123', 10)
        await db.query(
          "INSERT INTO users (nama, username, password, role) VALUES ('Verifikator Keuangan', 'verifikator', ?, 'verifikator')",
          [hashedVerifikator]
        )
      }
    }
  } catch (err) {
    console.error('Error initializing users table:', err.message)
  }
}

// Run initialization immediately on model load
initUserTable()

const getAllUsers = async () => {
  const [rows] = await db.query('SELECT id, nama, username, role, is_password_changed, created_at FROM users ORDER BY id ASC')
  return rows
}

const getUserByUsername = async (username) => {
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username])
  return rows[0] || null
}

const getUserById = async (id) => {
  const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id])
  return rows[0] || null
}

const createUser = async ({ nama, username, password, role }) => {
  const hashedPassword = await bcrypt.hash(password, 10)
  const [result] = await db.query(
    'INSERT INTO users (nama, username, password, role) VALUES (?, ?, ?, ?)',
    [nama, username, hashedPassword, role || 'admin']
  )
  return result
}

const updateUser = async (id, { nama, username, password, role }) => {
  if (password && password.trim() !== '') {
    const hashedPassword = await bcrypt.hash(password, 10)
    const [result] = await db.query(
      'UPDATE users SET nama = ?, username = ?, password = ?, role = ? WHERE id = ?',
      [nama, username, hashedPassword, role, id]
    )
    return result
  } else {
    const [result] = await db.query(
      'UPDATE users SET nama = ?, username = ?, role = ? WHERE id = ?',
      [nama, username, role, id]
    )
    return result
  }
}

const deleteUser = async (id) => {
  const [result] = await db.query('DELETE FROM users WHERE id = ?', [id])
  return result
}

const enableUser2FA = async (userId, secret) => {
  const [result] = await db.query(
    'UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE id = ?',
    [secret, userId]
  )
  return result
}

const changeUserPassword = async (userId, hashedPassword) => {
  const [result] = await db.query(
    'UPDATE users SET password = ?, is_password_changed = 1 WHERE id = ?',
    [hashedPassword, userId]
  )
  return result
}

module.exports = {
  getAllUsers,
  getUserByUsername,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  enableUser2FA,
  changeUserPassword
}
