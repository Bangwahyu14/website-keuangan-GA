const db = require('../config/database')

// Initialize Activity Logs Table automatically
const initLogTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        page VARCHAR(100) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `
    await db.query(createTableQuery)
  } catch (err) {
    console.error('Error initializing activity_logs table:', err.message)
  }
}

// Run initialization immediately on model load
initLogTable()

const insertLog = async (username, action, page, details) => {
  try {
    const user = username || 'System'
    await db.query(
      'INSERT INTO activity_logs (username, action, page, details) VALUES (?, ?, ?, ?)',
      [user, action, page, details || '']
    )
  } catch (err) {
    console.error('Error inserting activity log:', err.message)
  }
}

const getAllLogs = async () => {
  const [rows] = await db.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 500')
  return rows
}

module.exports = {
  insertLog,
  getAllLogs
}
