# Quick Fix Guide - Critical Bugs

This guide provides immediate fixes for the most critical bugs found in the KotigMoment project.

## 🔴 Fix #1: Database File Missing
**What**: Database was deleted  
**Impact**: App won't work at all

**Fix**:
```bash
# The database will auto-recreate when you start the server
cd server
npm run dev
# OR
npm start
```

---

## 🔴 Fix #2: Session Expiration Bug
**File**: `server/server.js` line 433  
**What**: Wrong parameter causes session expiration to fail

**Change this**:
```javascript
await dbHelpers.updateSession(id, { status: 'expired' });
```

**To this**:
```javascript
await dbHelpers.updateSession(session.id, { status: 'expired' });
```

---

## 🔴 Fix #3: Hardcoded User Path
**File**: `server/server.js` line 20  
**What**: Videos path only works for user "msalm"

**Change this**:
```javascript
const VIDEOS_DIRECTORY = process.env.VIDEOS_DIRECTORY || 'C:/Users/msalm/Videos';
```

**To this**:
```javascript
const VIDEOS_DIRECTORY = process.env.VIDEOS_DIRECTORY || 'C:/Replays';
```

---

## 🔴 Fix #4: OBS IP Address
**File**: `server/obs-websocket.js` line 17  
**What**: OBS connection fails on different networks

**Change this**:
```javascript
this.url = process.env.OBS_WEBSOCKET_URL || 'ws://192.168.1.5:4455';
```

**To this**:
```javascript
this.url = process.env.OBS_WEBSOCKET_URL || 'ws://localhost:4455';
```

---

## 🔴 Fix #5: Payment Page Route
**File**: `client/src/pages/PaymentPage.jsx` line 44  
**What**: Navigation goes to non-existent route

**Change this**:
```javascript
navigate(`/start-session/${sessionId}`)
```

**To this**:
```javascript
navigate(`/session-name/${sessionId}`)
```

---

## 🟡 Fix #6: Payment Response Bug
**File**: `server/server.js` line 180  
**What**: Returns database ID instead of session UUID

**Change this**:
```javascript
sessionId: session.id
```

**To this**:
```javascript
sessionId: session.session_id
```

---

## 🔒 Security Fix: Path Traversal Protection
**File**: `server/server.js` around line 630  
**What**: Add path validation to prevent directory traversal attacks

**Add after line 631**:
```javascript
const path = require('path'); // If not already imported at top

// After getting videoPath, add validation:
try {
  const realVideoPath = fs.realpathSync(videoPath);
  const realReplayDir = fs.realpathSync(REPLAY_DIRECTORY);
  const realVideosDir = fs.realpathSync(VIDEOS_DIRECTORY);
  
  if (!realVideoPath.startsWith(realVideosDir) && !realVideoPath.startsWith(realReplayDir)) {
    console.log(`❌ Path traversal attempt detected: ${decodedFilename}`);
    return res.status(403).json({ error: 'Access denied' });
  }
} catch (pathError) {
  console.log(`❌ Invalid path: ${decodedFilename}`);
  return res.status(404).json({ error: 'Video not found' });
}
```

---

## Environment Setup
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
REPLAY_DIRECTORY=C:/Replays
VIDEOS_DIRECTORY=C:/Replays

# OBS WebSocket Configuration
OBS_WEBSOCKET_URL=ws://localhost:4455
OBS_WEBSOCKET_PASSWORD=your_obs_password_here
```

---

## Testing After Fixes

1. **Test Database**:
   ```bash
   cd server
   npm run dev
   # Check console for "Database initialized successfully"
   ```

2. **Test Session Creation**:
   - Go to http://localhost:3000
   - Select a duration (30/60/120 min)
   - Enter a session name
   - Should navigate to session page

3. **Test Session Expiration**:
   - Wait for session cleanup interval (5 minutes)
   - Or manually test with short duration session

4. **Test OBS Connection**:
   - Make sure OBS is running
   - Enable OBS WebSocket on port 4455
   - Start a session
   - Check "Camera Status" on session page

5. **Test Video Gallery**:
   - Click "View Gallery" 
   - Should see session-specific folder
   - Test video playback

---

## Quick Command Reference

```bash
# Start development
npm run dev

# Start only server
cd server && npm run dev

# Start only client  
cd client && npm run dev

# Check database
cd server
node check-database.js

# Test OBS connection
node test-obs-connection.js

# Build for production
npm run build
npm start
```

---

## If Something Still Doesn't Work

1. **Check logs**: Look at both server and browser console
2. **Check ports**: Make sure 3000 (client) and 3001 (server) are free
3. **Check OBS**: Make sure OBS Studio is running and WebSocket is enabled
4. **Check paths**: Make sure C:/Replays directory exists
5. **Restart**: Try stopping all processes and starting fresh

---

## Need More Help?

See the full `BUG_REPORT.md` for detailed explanations of all issues.

