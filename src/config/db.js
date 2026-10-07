// src/config/db.js
import mysql from "mysql2";
import util from "util";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectionLimit: 20,         // MORE SCALABLE
  waitForConnections: true,
  queueLimit: 0
});


// Promisify pool.query to return ONLY rows
const query = util.promisify(pool.query).bind(pool);

// Test connection once at startup
(async () => {
  try {
    await query("SELECT 1");
    console.log("✅ MySQL Pool Connected Successfully!");
  } catch (err) {
    console.error("❌ MySQL Pool Connection Failed:", err.message);
  }
})();

// Export db object
const db = {
  query,   // always returns rows only
};

export default db;
