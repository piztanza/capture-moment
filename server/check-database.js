const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'sport_moment.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Function to show all tables
function showTables() {
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        console.log('\n📋 Available Tables:');
        rows.forEach(row => {
          console.log(`  - ${row.name}`);
        });
        resolve(rows);
      }
    });
  });
}

// Function to show sessions table structure
function showSessionsStructure() {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(sessions)", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        console.log('\n🏗️  Sessions Table Structure:');
        console.log('┌─────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐');
        console.log('│ Column Name     │ Type        │ Not Null    │ Default     │ Primary Key │');
        console.log('├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤');
        rows.forEach(row => {
          console.log(`│ ${row.name.padEnd(15)} │ ${row.type.padEnd(11)} │ ${(row.notnull ? 'YES' : 'NO').padEnd(11)} │ ${(row.dflt_value || 'NULL').toString().padEnd(11)} │ ${(row.pk ? 'YES' : 'NO').padEnd(11)} │`);
        });
        console.log('└─────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘');
        resolve(rows);
      }
    });
  });
}

// Function to show all sessions
function showAllSessions() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM sessions ORDER BY created_at DESC", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        console.log('\n📊 All Sessions:');
        if (rows.length === 0) {
          console.log('  No sessions found.');
        } else {
          console.log('┌─────┬──────────────────────────────────────┬─────────────────┬─────────────┬─────────────────────┬─────────────┬─────────────────────┐');
          console.log('│ ID  │ Session ID                           │ Session Name    │ Duration    │ Start Time           │ Status      │ Created At           │');
          console.log('├─────┼──────────────────────────────────────┼─────────────────┼─────────────┼─────────────────────┼─────────────┼─────────────────────┤');
          
          rows.forEach(row => {
            const id = row.id.toString().padEnd(3);
            const sessionId = (row.session_id || 'NULL').substring(0, 36).padEnd(36);
            const sessionName = (row.session_name || 'NULL').substring(0, 15).padEnd(15);
            const duration = (row.duration_minutes || 'NULL').toString().padEnd(11);
            const startTime = row.start_time ? new Date(row.start_time).toLocaleString().substring(0, 19) : 'NULL';
            const status = (row.status || 'NULL').padEnd(11);
            const createdAt = row.created_at ? new Date(row.created_at).toLocaleString().substring(0, 19) : 'NULL';
            
            console.log(`│ ${id} │ ${sessionId} │ ${sessionName} │ ${duration} │ ${startTime.padEnd(19)} │ ${status} │ ${createdAt.padEnd(19)} │`);
          });
          
          console.log('└─────┴──────────────────────────────────────┴─────────────────┴─────────────┴─────────────────────┴─────────────┴─────────────────────┘');
        }
        resolve(rows);
      }
    });
  });
}

// Function to show session statistics
function showSessionStats() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(duration_minutes) as avg_duration
      FROM sessions 
      GROUP BY status
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        console.log('\n📈 Session Statistics:');
        console.log('┌─────────────┬───────┬─────────────────┐');
        console.log('│ Status      │ Count │ Avg Duration    │');
        console.log('├─────────────┼───────┼─────────────────┤');
        
        rows.forEach(row => {
          const status = (row.status || 'NULL').padEnd(11);
          const count = row.count.toString().padEnd(5);
          const avgDuration = row.avg_duration ? row.avg_duration.toFixed(1) + ' min' : 'N/A';
          console.log(`│ ${status} │ ${count} │ ${avgDuration.padEnd(15)} │`);
        });
        
        console.log('└─────────────┴───────┴─────────────────┘');
        resolve(rows);
      }
    });
  });
}

// Main function
async function main() {
  try {
    console.log('🔍 SQLite Database Inspector');
    console.log('============================');
    
    await showTables();
    await showSessionsStructure();
    await showAllSessions();
    await showSessionStats();
    
    console.log('\n✅ Database inspection complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\n🔒 Database connection closed.');
      }
    });
  }
}

// Run the inspection
main();
