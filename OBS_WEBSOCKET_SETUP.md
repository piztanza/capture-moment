# OBS WebSocket Setup Guide

## Overview
The application now uses OBS WebSocket API to directly trigger replay buffer saves, which is more reliable than simulating keypresses.

## OBS Studio Setup

### 1. Install OBS WebSocket Plugin
1. Download the OBS WebSocket plugin from: https://github.com/obsproject/obs-websocket/releases
2. Install the plugin according to your OBS Studio version
3. Restart OBS Studio

### 2. Enable WebSocket Server
1. Open OBS Studio
2. Go to **Tools** → **WebSocket Server Settings**
3. Check **Enable WebSocket server**
4. Set **Server Port** to `4455` (default)
5. Set **Server Password** (optional but recommended)
6. Click **OK**

### 3. Configure Replay Buffer
1. Go to **Settings** → **Output**
2. Set **Output Mode** to "Advanced"
3. In **Recording** tab:
   - Enable **Replay Buffer**
   - Set **Replay Buffer Time** (e.g., 30 seconds)
   - Set **Replay Buffer Memory Usage** (e.g., 2GB)
4. Click **OK**

### 4. Start Replay Buffer
1. In OBS Studio, click **Start Replay Buffer**
2. The buffer will continuously record the last X seconds
3. The WebSocket API will save the buffer when triggered

## Application Configuration

### Environment Variables
Create a `.env` file in the server directory:

```env
# OBS WebSocket Configuration
OBS_WEBSOCKET_URL=ws://localhost:4455
OBS_WEBSOCKET_PASSWORD=your_obs_password_here

# Server Configuration
PORT=3001
REPLAY_DIRECTORY=C:/Replays
```

### Testing the Connection

1. **Start OBS Studio** with WebSocket server enabled
2. **Start the backend server**:
   ```bash
   cd server
   node server.js
   ```
3. **Test the WebSocket connection**:
   ```bash
   curl -X POST http://localhost:3001/api/obs/save-replay
   ```

## How It Works

### 1. WebSocket Connection
- The server connects to OBS WebSocket on startup
- Maintains persistent connection with auto-reconnect
- Handles authentication if password is set

### 2. Replay Buffer Save
- Frontend calls `/api/obs/save-replay`
- Server sends `SaveReplayBuffer` request to OBS
- OBS saves the current replay buffer to disk
- Server returns success/failure response

### 3. Fallback Mechanism
- If WebSocket fails, falls back to F9 keypress method
- Ensures replay capture works even if OBS WebSocket is unavailable
- Provides multiple layers of reliability

## API Endpoints

### Primary Method: OBS WebSocket
```
POST /api/obs/save-replay
```
- **Purpose**: Save OBS replay buffer via WebSocket
- **Response**: Success/failure with details
- **Fallback**: Automatically falls back to F9 keypress

### Fallback Method: F9 Keypress
```
POST /api/trigger-replay
```
- **Purpose**: Trigger F9 keypress for OBS
- **Usage**: Fallback when WebSocket is unavailable
- **Methods**: robotjs, PowerShell, AppleScript, xdotool

## Troubleshooting

### WebSocket Connection Issues
1. **Check OBS WebSocket Plugin**:
   - Ensure plugin is installed and enabled
   - Verify WebSocket server is running
   - Check port 4455 is not blocked

2. **Check Network**:
   - Ensure localhost connectivity
   - Verify firewall settings
   - Test with telnet: `telnet localhost 4455`

3. **Check Authentication**:
   - Verify password matches OBS settings
   - Test without password first
   - Check OBS WebSocket logs

### Replay Buffer Issues
1. **Check OBS Settings**:
   - Ensure replay buffer is enabled
   - Verify buffer time is set
   - Check output directory permissions

2. **Check OBS Status**:
   - Ensure replay buffer is started
   - Verify OBS is not in Studio Mode
   - Check for OBS errors

### Application Issues
1. **Check Server Logs**:
   - Look for WebSocket connection errors
   - Verify API endpoint responses
   - Check fallback method execution

2. **Check Frontend Logs**:
   - Verify API calls are being made
   - Check for network errors
   - Verify response handling

## Advanced Configuration

### Custom WebSocket URL
```env
OBS_WEBSOCKET_URL=ws://192.168.1.100:4455
```

### Authentication
```env
OBS_WEBSOCKET_PASSWORD=your_secure_password
```

### Multiple OBS Instances
- Each instance needs different port
- Update WebSocket URL accordingly
- Consider load balancing for multiple instances

## Security Considerations

1. **Password Protection**:
   - Always set a strong password
   - Use environment variables for credentials
   - Don't commit passwords to version control

2. **Network Security**:
   - Use localhost for single-machine setup
   - Consider VPN for remote access
   - Implement proper firewall rules

3. **Access Control**:
   - Limit WebSocket access to trusted sources
   - Monitor connection attempts
   - Log all replay buffer operations

## Performance Optimization

1. **Connection Management**:
   - Persistent WebSocket connection
   - Automatic reconnection on failure
   - Connection pooling for multiple clients

2. **Buffer Management**:
   - Optimize replay buffer size
   - Monitor disk space usage
   - Implement cleanup routines

3. **Error Handling**:
   - Graceful degradation to fallback methods
   - Comprehensive error logging
   - User-friendly error messages

## Production Deployment

1. **Environment Setup**:
   - Use production OBS WebSocket settings
   - Configure proper logging
   - Set up monitoring and alerts

2. **Backup Systems**:
   - Multiple OBS instances
   - Redundant WebSocket connections
   - Fallback to keypress methods

3. **Monitoring**:
   - WebSocket connection status
   - Replay buffer save success rate
   - System resource usage

This setup provides a robust, reliable system for triggering OBS replay buffer saves directly through the WebSocket API, with comprehensive fallback mechanisms for maximum reliability.
