const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'sport_moment.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
🔧 SQLite Database Manager
==========================

Usage: node db-manager.js [command] [options]

READ COMMANDS:
  help                    - Show this help message
  tables                  - Show all tables
  sessions                - Show all sessions
  active                  - Show only active sessions
  expired                 - Show only expired sessions
  stats                   - Show session statistics
  sql [query]             - Run custom SQL query

UPDATE COMMANDS:
  update-status [id] [status]     - Update session status (created, active, expired)
  update-name [id] [name]         - Update session name
  update-duration [id] [minutes]  - Update session duration
  expire-session [id]             - Mark session as expired
  activate-session [id]           - Mark session as active
  delete-session [id]             - Delete a session
  cleanup-expired                 - Mark all expired sessions as expired

EXAMPLES:
  # Read operations
  node db-manager.js sessions
  node db-manager.js active
  node db-manager.js sql "SELECT * FROM sessions WHERE status = 'active'"
  
  # Update operations
  node db-manager.js update-status 1 active
  node db-manager.js update-name 1 "New Session Name"
  node db-manager.js expire-session 1
  node db-manager.js delete-session 1
  node db-manager.js cleanup-expired
`);
}

function runQuery(query, description, params = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n${description}:`);
    console.log('─'.repeat(50));
    
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('❌ Error:', err.message);
          reject(err);
        } else {
          if (rows.length === 0) {
            console.log('No results found.');
          } else {
            console.table(rows);
          }
          resolve(rows);
        }
      });
    } else {
      db.run(query, params, function(err) {
        if (err) {
          console.error('❌ Error:', err.message);
          reject(err);
        } else {
          console.log(`✅ Query executed successfully. Rows affected: ${this.changes}`);
          resolve({ changes: this.changes });
        }
      });
    }
  });
}

async function main() {
  try {
    switch (command) {
      case 'help':
        showHelp();
        break;

      case 'tables':
        await runQuery("SELECT name FROM sqlite_master WHERE type='table'", '📋 Available Tables');
        break;

      case 'sessions':
        await runQuery(`
          SELECT 
            id,
            session_id,
            session_name,
            duration_minutes,
            start_time,
            status,
            created_at
          FROM sessions 
          ORDER BY created_at DESC
        `, '📊 All Sessions');
        break;

      case 'active':
        await runQuery(`
          SELECT 
            id,
            session_id,
            session_name,
            duration_minutes,
            start_time,
            status,
            created_at
          FROM sessions 
          WHERE status = 'active'
          ORDER BY start_time DESC
        `, '🟢 Active Sessions');
        break;

      case 'expired':
        await runQuery(`
          SELECT 
            id,
            session_id,
            session_name,
            duration_minutes,
            start_time,
            status,
            created_at
          FROM sessions 
          WHERE status = 'expired'
          ORDER BY start_time DESC
        `, '🔴 Expired Sessions');
        break;

      case 'stats':
        await runQuery(`
          SELECT 
            status,
            COUNT(*) as count,
            AVG(duration_minutes) as avg_duration,
            MIN(created_at) as first_created,
            MAX(created_at) as last_created
          FROM sessions 
          GROUP BY status
        `, '📈 Session Statistics');
        break;

      case 'sql':
        if (args.length < 2) {
          console.error('❌ Please provide a SQL query');
          console.log('Example: node db-manager.js sql "SELECT * FROM sessions"');
          break;
        }
        const query = args.slice(1).join(' ');
        await runQuery(query, '🔍 Custom SQL Query');
        break;

      case 'update-status':
        if (args.length < 3) {
          console.error('❌ Usage: node db-manager.js update-status [id] [status]');
          console.log('Valid statuses: created, active, expired');
          break;
        }
        const id = args[1];
        const status = args[2];
        if (!['created', 'active', 'expired'].includes(status)) {
          console.error('❌ Invalid status. Valid statuses: created, active, expired');
          break;
        }
        await runQuery(
          'UPDATE sessions SET status = ? WHERE id = ?',
          `🔄 Updating session ${id} status to ${status}`,
          [status, id]
        );
        break;

      case 'update-name':
        if (args.length < 3) {
          console.error('❌ Usage: node db-manager.js update-name [id] [name]');
          break;
        }
        const sessionId = args[1];
        const name = args.slice(2).join(' ');
        await runQuery(
          'UPDATE sessions SET session_name = ? WHERE id = ?',
          `🔄 Updating session ${sessionId} name to "${name}"`,
          [name, sessionId]
        );
        break;

      case 'update-duration':
        if (args.length < 3) {
          console.error('❌ Usage: node db-manager.js update-duration [id] [minutes]');
          break;
        }
        const durationId = args[1];
        const minutes = parseInt(args[2]);
        if (isNaN(minutes) || ![30, 60, 120].includes(minutes)) {
          console.error('❌ Invalid duration. Valid durations: 30, 60, 120');
          break;
        }
        await runQuery(
          'UPDATE sessions SET duration_minutes = ? WHERE id = ?',
          `🔄 Updating session ${durationId} duration to ${minutes} minutes`,
          [minutes, durationId]
        );
        break;

      case 'expire-session':
        if (args.length < 2) {
          console.error('❌ Usage: node db-manager.js expire-session [id]');
          break;
        }
        const expireId = args[1];
        await runQuery(
          'UPDATE sessions SET status = "expired" WHERE id = ?',
          `⏰ Marking session ${expireId} as expired`,
          [expireId]
        );
        break;

      case 'activate-session':
        if (args.length < 2) {
          console.error('❌ Usage: node db-manager.js activate-session [id]');
          break;
        }
        const activateId = args[1];
        await runQuery(
          'UPDATE sessions SET status = "active", start_time = datetime("now") WHERE id = ?',
          `▶️ Activating session ${activateId}`,
          [activateId]
        );
        break;

      case 'delete-session':
        if (args.length < 2) {
          console.error('❌ Usage: node db-manager.js delete-session [id]');
          break;
        }
        const deleteId = args[1];
        await runQuery(
          'DELETE FROM sessions WHERE id = ?',
          `🗑️ Deleting session ${deleteId}`,
          [deleteId]
        );
        break;

      case 'cleanup-expired':
        await runQuery(`
          UPDATE sessions 
          SET status = 'expired' 
          WHERE status = 'active' 
          AND datetime('now') > datetime(start_time, '+' || duration_minutes || ' minutes')
        `, '🧹 Cleaning up expired sessions');
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    db.close();
  }
}

main();
