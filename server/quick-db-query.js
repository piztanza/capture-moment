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
🔍 Quick SQLite Database Query Tool
==================================

Usage: node quick-db-query.js [command]

Commands:
  help          - Show this help message
  tables        - Show all tables
  sessions      - Show all sessions
  active        - Show only active sessions
  expired       - Show only expired sessions
  stats         - Show session statistics
  sql [query]   - Run custom SQL query

Examples:
  node quick-db-query.js sessions
  node quick-db-query.js active
  node quick-db-query.js sql "SELECT * FROM sessions WHERE status = 'active'"
`);
}

function runQuery(query, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n${description}:`);
    console.log('─'.repeat(50));
    
    db.all(query, (err, rows) => {
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
  });
}

async function main() {
  try {
    switch (command) {
      case 'help':
      case undefined:
        showHelp();
        break;
        
      case 'tables':
        await runQuery(
          "SELECT name FROM sqlite_master WHERE type='table'",
          '📋 Available Tables'
        );
        break;
        
      case 'sessions':
        await runQuery(
          "SELECT id, session_id, session_name, duration_minutes, start_time, status, created_at FROM sessions ORDER BY created_at DESC",
          '📊 All Sessions'
        );
        break;
        
      case 'active':
        await runQuery(
          "SELECT id, session_id, session_name, duration_minutes, start_time, status FROM sessions WHERE status = 'active' ORDER BY start_time DESC",
          '🟢 Active Sessions'
        );
        break;
        
      case 'expired':
        await runQuery(
          "SELECT id, session_id, session_name, duration_minutes, start_time, status FROM sessions WHERE status = 'expired' ORDER BY start_time DESC",
          '🔴 Expired Sessions'
        );
        break;
        
      case 'stats':
        await runQuery(
          `SELECT 
            status,
            COUNT(*) as count,
            AVG(duration_minutes) as avg_duration,
            MIN(created_at) as first_created,
            MAX(created_at) as last_created
           FROM sessions 
           GROUP BY status`,
          '📈 Session Statistics'
        );
        break;
        
      case 'sql':
        if (args.length < 2) {
          console.log('❌ Please provide a SQL query after "sql"');
          console.log('Example: node quick-db-query.js sql "SELECT * FROM sessions"');
          break;
        }
        const query = args.slice(1).join(' ');
        await runQuery(query, '🔍 Custom Query Result');
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        showHelp();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    db.close();
  }
}

main();
