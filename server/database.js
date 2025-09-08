const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'sport_moment.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT UNIQUE NOT NULL,
          session_name TEXT,
          duration_minutes INTEGER NOT NULL,
          start_time DATETIME,
          status TEXT DEFAULT 'created',
          midtrans_order_id TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating sessions table:', err.message);
          reject(err);
        } else {
          console.log('Sessions table created or already exists');
          resolve();
        }
      });
    });
  });
};

// Database helper functions
const dbHelpers = {
  // Create a new session
  createSession: (sessionId, duration) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO sessions (session_id, duration_minutes, status)
        VALUES (?, ?, 'created')
      `);
      
      stmt.run([sessionId, duration], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, session_id: sessionId, duration_minutes: duration });
        }
      });
      
      stmt.finalize();
    });
  },

  // Get session by ID
  getSession: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM sessions WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Get session by session_id
  getSessionBySessionId: (sessionId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM sessions WHERE session_id = ?', [sessionId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Update session
  updateSession: (id, updates) => {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(id);

      db.run(`UPDATE sessions SET ${fields} WHERE id = ?`, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  },

  // Get session by order ID
  getSessionByOrderId: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM sessions WHERE midtrans_order_id = ?', [orderId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
};

module.exports = { db, initDatabase, dbHelpers };
