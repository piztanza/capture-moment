# Bug Report - KotigMoment Project
Generated: Friday, October 3, 2025

## Critical Bugs 🔴

### 1. Database File Missing
**Location**: `server/sport_moment.db`  
**Status**: Deleted (shown in git status)  
**Severity**: Critical  
**Impact**: Application will fail to start or operate properly without the database file.

**Details**:
- The SQLite database file has been deleted from the repository
- This will cause the application to recreate an empty database on startup
- All existing session data will be lost

**Fix**:
```bash
# The database will be automatically recreated when the server starts
# However, any existing data is lost
cd server
npm run dev
```

---

### 2. Wrong Parameter in Session Expiration Check
**Location**: `server/server.js:433`  
**Severity**: Critical  
**Impact**: Session expiration updates may fail, causing sessions to not properly expire.

**Bug Code**:
```javascript
// Line 433
await dbHelpers.updateSession(id, { status: 'expired' });
```

**Issue**: The variable `id` is from `req.params` but should use `session.id` (the database ID).

**Fix**:
```javascript
// Should be:
await dbHelpers.updateSession(session.id, { status: 'expired' });
```

---

### 3. Hardcoded User-Specific Path
**Location**: `server/server.js:20`  
**Severity**: High  
**Impact**: Videos directory will fail on other systems/users.

**Bug Code**:
```javascript
const VIDEOS_DIRECTORY = process.env.VIDEOS_DIRECTORY || 'C:/Users/msalm/Videos';
```

**Issue**: Default path contains a specific username "msalm" which won't exist on other systems.

**Fix**:
```javascript
const VIDEOS_DIRECTORY = process.env.VIDEOS_DIRECTORY || 'C:/Replays';
// Or use a more generic default path
```

---

### 4. Hardcoded LAN IP Address
**Location**: `server/obs-websocket.js:17`  
**Severity**: High  
**Impact**: OBS WebSocket connection will fail on other networks.

**Bug Code**:
```javascript
this.url = process.env.OBS_WEBSOCKET_URL || 'ws://192.168.1.5:4455';
```

**Issue**: Default URL points to a specific LAN IP (192.168.1.5) which won't work on other networks.

**Fix**:
```javascript
this.url = process.env.OBS_WEBSOCKET_URL || 'ws://localhost:4455';
// Or use ws://127.0.0.1:4455
```

---

### 5. Payment Page Navigation Bug
**Location**: `client/src/pages/PaymentPage.jsx:44`  
**Severity**: High  
**Impact**: Users cannot complete the payment flow properly.

**Bug Code**:
```javascript
navigate(`/start-session/${sessionId}`)
```

**Issue**: Route `/start-session/:sessionId` doesn't exist in the router. Should be `/session-name/:sessionId`.

**Fix**:
```javascript
navigate(`/session-name/${sessionId}`)
```

---

## Medium Severity Bugs 🟡

### 6. Memory Leak Potential - Event Listener Accumulation
**Location**: `server/obs-websocket.js` - Multiple methods (lines 283, 337, 391, etc.)  
**Severity**: Medium  
**Impact**: Multiple message handlers could accumulate over time, causing performance issues.

**Issue**: Message event listeners are added without always being properly removed, especially when timeouts occur.

**Example** (line 283):
```javascript
this.ws.on('message', handleResponse);
```

**Fix**: Ensure all event listeners are removed in timeout scenarios:
```javascript
const handleResponse = (message) => {
  // ... handler logic
};

const timeout = setTimeout(() => {
  this.ws.removeListener('message', handleResponse); // Add this
  reject(new Error('Timeout'));
}, 10000);
```

---

### 7. Race Condition in Session Cleanup
**Location**: `server/server.js:48-90`  
**Severity**: Medium  
**Impact**: Could cause issues with OBS connection management during session transitions.

**Issue**: The cleanup function accesses `session.session_id` (line 71) but might not properly handle cases where the session is being updated simultaneously.

**Recommendation**: Add proper locking mechanism or use database transactions.

---

### 8. Incorrect Session ID Usage in Payment Response
**Location**: `server/server.js:180`  
**Severity**: Medium  
**Impact**: Payment page receives database ID instead of session UUID.

**Bug Code**:
```javascript
res.json({
  orderId,
  amount: price,
  duration,
  qrCode: qrCodeDataURL,
  sessionId: session.id  // This is database ID (integer)
});
```

**Issue**: Should return `session.session_id` (UUID) instead of `session.id` (integer).

**Fix**:
```javascript
sessionId: session.session_id  // Return the UUID
```

---

## Low Severity Issues 🟢

### 9. Missing Error Handling for QR Code Generation
**Location**: `client/src/pages/GalleryPage.jsx:106-128`  
**Severity**: Low  
**Impact**: Silent failure if QR code generation fails.

**Recommendation**: Add user-facing error message when QR code generation fails.

---

### 10. Inconsistent Database Schema Documentation
**Location**: `README.md:159-167` vs `server/database.js:19-29`  
**Severity**: Low  
**Impact**: Documentation shows `status TEXT DEFAULT 'pending'` but code uses `status TEXT DEFAULT 'created'`.

**Fix**: Update README.md to match actual implementation:
```markdown
status TEXT DEFAULT 'created',
```

---

### 11. Unused PaymentPage Component
**Location**: `client/src/pages/PaymentPage.jsx`  
**Severity**: Low  
**Impact**: Dead code - payment page is bypassed in current flow.

**Issue**: HomePage directly navigates to SessionNamePage, skipping PaymentPage entirely.

**Recommendation**: Either remove PaymentPage or update flow to use it.

---

### 12. Missing Input Validation
**Location**: Multiple endpoints in `server/server.js`  
**Severity**: Low  
**Impact**: Potential security issues and unexpected errors.

**Examples**:
- `/api/session/:id` - No validation that ID is valid format
- `/api/video/:filename` - Basic security check exists but could be improved
- Session name length limit on frontend (50 chars) but no backend validation

**Recommendation**: Add server-side validation for all user inputs.

---

## Code Quality Issues 📝

### 13. Commented Out Code
**Location**: `client/src/pages/SessionPage.jsx:204-226`  
**Severity**: Low  
**Impact**: Confusing and reduces code maintainability.

**Issue**: F9 key listener code is commented out but not removed.

**Recommendation**: Remove commented code or document why it's disabled.

---

### 14. Console Logging in Production Code
**Location**: Throughout the codebase  
**Severity**: Low  
**Impact**: Performance and security concerns.

**Issue**: Extensive console.log statements throughout production code, including sensitive information like OBS passwords (not shown in logs, but password presence is logged).

**Recommendation**: 
- Use proper logging library (winston, pino)
- Remove or conditionally disable debug logs in production
- Never log sensitive information

---

### 15. Missing Environment Variables Documentation
**Location**: `env.example:20`  
**Severity**: Low  
**Impact**: VIDEOS_DIRECTORY is not documented in env.example.

**Fix**: Add to env.example:
```env
VIDEOS_DIRECTORY=C:/Videos
```

---

## Performance Issues ⚡

### 16. Session Cleanup Interval Too Frequent
**Location**: `server/server.js:93`  
**Severity**: Low  
**Impact**: Unnecessary database queries every 5 minutes.

**Current**:
```javascript
setInterval(cleanupExpiredSessions, 5 * 60 * 1000); // Every 5 minutes
```

**Recommendation**: For sessions that last 30-120 minutes, checking every 5 minutes is excessive. Consider checking every 10-15 minutes.

---

### 17. Video Metadata Loaded on Every Gallery Refresh
**Location**: `client/src/pages/GalleryPage.jsx:563`  
**Severity**: Low  
**Impact**: Performance issue with many videos.

**Issue**: File stats are read synchronously for every video on every request.

**Recommendation**: Cache video metadata or load lazily.

---

## Security Issues 🔒

### 18. No Rate Limiting
**Location**: All API endpoints  
**Severity**: Medium  
**Impact**: API abuse possible.

**Recommendation**: Implement rate limiting with express-rate-limit.

---

### 19. Path Traversal Risk
**Location**: `server/server.js:599-673`  
**Severity**: Medium  
**Impact**: Potential security vulnerability.

**Current Protection** (line 634):
```javascript
if (!fs.existsSync(videoPath)) {
  return res.status(404).json({ error: 'Video not found' });
}
```

**Issue**: No validation that the resolved path is within allowed directories.

**Recommendation**: Add path validation:
```javascript
const path = require('path');
const realPath = fs.realpathSync(videoPath);
if (!realPath.startsWith(VIDEOS_DIRECTORY) && !realPath.startsWith(REPLAY_DIRECTORY)) {
  return res.status(403).json({ error: 'Access denied' });
}
```

---

## Testing Recommendations 🧪

1. **Database Tests**: Add tests for database operations, especially session lifecycle
2. **OBS WebSocket Tests**: Mock OBS WebSocket responses
3. **Session Expiration**: Test session cleanup logic
4. **Payment Flow**: Test the complete payment flow (currently bypassed)
5. **Error Handling**: Test all error scenarios (network failures, OBS disconnection, etc.)
6. **Security**: Test path traversal attempts, malicious inputs

---

## Summary

**Total Issues Found**: 19

- **Critical**: 5
- **Medium**: 6  
- **Low**: 8

**Immediate Action Required**:
1. Fix database file issue (regenerate or restore)
2. Fix session expiration parameter bug (line 433)
3. Change hardcoded paths and IP addresses to use localhost/generic defaults
4. Fix PaymentPage navigation route
5. Add path traversal protection

**Recommended Next Steps**:
1. Set up proper environment variables
2. Add comprehensive error handling
3. Implement proper logging
4. Add input validation
5. Set up automated tests
6. Review and remove commented code
7. Add rate limiting
8. Update documentation to match implementation

