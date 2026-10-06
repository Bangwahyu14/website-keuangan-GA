const logModel = require('../models/logModel')

const getLogs = async (req, res) => {
  try {
    const logs = await logModel.getAllLogs()
    res.status(200).json({ status: 'success', data: logs })
  } catch (err) {
    console.error('Error fetching activity logs:', err)
    res.status(500).json({ status: 'error', message: err.message })
  }
}

module.exports = {
  getLogs
}
