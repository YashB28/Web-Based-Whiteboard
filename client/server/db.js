// server/db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Create / open database file whiteboard.db in this folder
const dbPath = path.join(__dirname, "whiteboard.db");
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist yet
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Whiteboard sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS whiteboard_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT UNIQUE NOT NULL,
      image_data TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
});

module.exports = db;