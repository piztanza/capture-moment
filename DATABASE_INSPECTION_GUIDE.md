# 🔍 SQLite Database Inspection Guide

This guide shows you multiple ways to check and inspect your SQLite database data.

## 📁 Database Location
Your SQLite database is located at: `server/sport_moment.db`

## 🛠️ Method 1: Node.js Scripts (Recommended)

### Quick Database Query Tool
I've created a simple command-line tool for quick database queries:

```bash
# Navigate to server directory
cd server

# Show help
node quick-db-query.js help

# Show all sessions
node quick-db-query.js sessions

# Show only active sessions
node quick-db-query.js active

# Show only expired sessions
node quick-db-query.js expired

# Show session statistics
node quick-db-query.js stats

# Run custom SQL query
node quick-db-query.js sql "SELECT * FROM sessions WHERE status = 'active'"
```

### Detailed Database Inspector
For a comprehensive view of your database:

```bash
cd server
node check-database.js
```

This will show:
- All available tables
- Table structure
- All sessions with formatted output
- Session statistics

## 🌐 Method 2: Web Interface

I've created a web-based database inspector that you can access in your browser:

1. Start your server: `npm start` (in the server directory)
2. Open your browser and go to: `http://localhost:3001/db-inspector.html`

This provides:
- Real-time database statistics
- Formatted table view of all sessions
- Auto-refresh every 30 seconds
- Color-coded status badges

## 🔧 Method 3: API Endpoint

You can also access database data via API:

```bash
# Get database inspection data as JSON
curl http://localhost:3001/api/db/inspect
```

Or visit in browser: `http://localhost:3001/api/db/inspect`

## 📊 Method 4: SQLite Command Line (If Available)

If you have SQLite command line tool installed:

```bash
# Navigate to server directory
cd server

# Open database
sqlite3 sport_moment.db

# Show all tables
.tables

# Show table structure
.schema sessions

# Show all sessions
SELECT * FROM sessions;

# Show active sessions
SELECT * FROM sessions WHERE status = 'active';

# Show session statistics
SELECT status, COUNT(*) as count, AVG(duration_minutes) as avg_duration 
FROM sessions GROUP BY status;

# Exit SQLite
.quit
```

## 📋 Database Schema

Your `sessions` table has the following structure:

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| session_id | TEXT | Unique session identifier (UUID) |
| session_name | TEXT | User-provided session name |
| duration_minutes | INTEGER | Session duration in minutes |
| start_time | DATETIME | When the session was started |
| status | TEXT | Session status (created, active, expired, paid) |
| midtrans_order_id | TEXT | Payment order ID (for legacy support) |
| created_at | DATETIME | When the session was created |

## 🔍 Common Queries

Here are some useful SQL queries you can run:

```sql
-- Show all sessions ordered by creation date
SELECT * FROM sessions ORDER BY created_at DESC;

-- Show active sessions with time remaining
SELECT 
    id, 
    session_name, 
    duration_minutes,
    start_time,
    datetime(start_time, '+' || duration_minutes || ' minutes') as end_time,
    CASE 
        WHEN datetime('now') > datetime(start_time, '+' || duration_minutes || ' minutes') 
        THEN 'EXPIRED' 
        ELSE 'ACTIVE' 
    END as time_status
FROM sessions 
WHERE status = 'active';

-- Show session statistics by status
SELECT 
    status,
    COUNT(*) as count,
    AVG(duration_minutes) as avg_duration,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM sessions 
GROUP BY status;

-- Show sessions created today
SELECT * FROM sessions 
WHERE DATE(created_at) = DATE('now');

-- Show expired sessions
SELECT * FROM sessions 
WHERE status = 'active' 
AND datetime('now') > datetime(start_time, '+' || duration_minutes || ' minutes');
```

## 🚀 Quick Start

1. **For quick checks**: Use `node quick-db-query.js sessions`
2. **For detailed inspection**: Use `node check-database.js`
3. **For web interface**: Visit `http://localhost:3001/db-inspector.html`
4. **For API access**: Use `http://localhost:3001/api/db/inspect`

## 🔄 Auto-Cleanup

The server automatically runs session cleanup every 5 minutes to mark expired sessions. You can see this in the server logs when sessions are marked as expired.

## 📝 Notes

- The database file is created automatically when the server starts
- All timestamps are stored in UTC
- Session IDs are UUIDs for security
- The system maintains backward compatibility with the payment flow
