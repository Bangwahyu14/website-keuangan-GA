const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sistem_keuangan',
    port: 3306
});

db.getConnection()
    .then(() => console.log('Koneksi Database MySQL Berhasil!'))
    .catch((err) => console.error('Gagal koneksi ke Database:', err));

module.exports = db;