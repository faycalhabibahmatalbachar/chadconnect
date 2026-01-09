const mysql = require('mysql2/promise');

function requiredEnv(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === null || v === '') {
    throw new Error(`Missing env: ${name}`);
  }
  return v;
}

const pool = mysql.createPool({
  host: requiredEnv('MYSQL_HOST', '127.0.0.1'),
  port: Number(requiredEnv('MYSQL_PORT', '3306')),
  user: requiredEnv('MYSQL_USER', 'root'),
  password: process.env.MYSQL_PASSWORD ?? '',
  database: requiredEnv('MYSQL_DATABASE', 'chadconnect'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = {
  pool,
};
