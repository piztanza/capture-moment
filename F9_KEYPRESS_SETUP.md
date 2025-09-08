# F9 Keypress Setup for OBS Replay Buffer

## Overview
The application now supports triggering F9 keypress to save OBS replay buffer through multiple methods for maximum compatibility.

## Implementation Methods

### 1. Browser-Based F9 Keypress (Frontend)
- **Location**: `client/src/pages/SessionPage.jsx`
- **Method**: Creates and dispatches KeyboardEvent for F9
- **Limitations**: May not work in all browsers due to security restrictions
- **Usage**: Automatic when clicking "Take Replay" button or pressing F9

### 2. Server-Side F9 Keypress (Backend)
- **Location**: `server/server.js` - `/api/trigger-replay` endpoint
- **Methods**: Multiple fallback approaches for different operating systems

#### Windows
```powershell
powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{F9}')"
```

#### macOS
```bash
osascript -e "tell application \"System Events\" to key code 99"
```

#### Linux
```bash
xdotool key F9
```

### 3. Optional: robotjs (Advanced)
- **Package**: `robotjs` (requires compilation)
- **Installation**: `npm install robotjs` (may require build tools)
- **Usage**: Direct system-level keypress simulation

## OBS Setup Requirements

### 1. Enable Replay Buffer
1. Open OBS Studio
2. Go to **Settings** → **Output**
3. Set **Output Mode** to "Advanced"
4. In **Recording** tab, enable **Replay Buffer**
5. Set **Replay Buffer Time** (e.g., 30 seconds)

### 2. Set F9 Hotkey
1. Go to **Settings** → **Hotkeys**
2. Find **Replay Buffer** section
3. Set **Save Replay** to **F9** key
4. Click **OK** to save

### 3. Start Replay Buffer
1. Click **Start Replay Buffer** in OBS
2. The buffer will continuously record the last X seconds
3. Press F9 (or use the kiosk app) to save the current buffer

## Testing the Implementation

### 1. Test Browser Method
1. Open the kiosk app
2. Start a session
3. Click "Take Replay" button
4. Check browser console for "Browser F9 keypress triggered"

### 2. Test Server Method
1. Start the server: `npm run dev`
2. Use the kiosk app to trigger replay
3. Check server console for keypress confirmation
4. Verify OBS saves the replay

### 3. Test Physical F9 Key
1. Press F9 on your keyboard while in the session
2. Should trigger the same replay capture
3. Check console for confirmation

## Troubleshooting

### Browser Method Not Working
- **Cause**: Browser security restrictions
- **Solution**: Use server-side method or physical F9 key

### Server Method Not Working
- **Windows**: Ensure PowerShell is available
- **macOS**: Grant accessibility permissions to terminal
- **Linux**: Install xdotool: `sudo apt-get install xdotool`

### OBS Not Responding
1. Check OBS hotkey settings
2. Ensure replay buffer is started
3. Verify F9 is not conflicting with other applications
4. Try different hotkey (F10, F11, etc.)

## Alternative Approaches

### 1. OBS WebSocket Plugin
- Install OBS WebSocket plugin
- Use WebSocket API to trigger replay buffer
- More reliable than keypress simulation

### 2. OBS Studio API
- Use OBS Studio's built-in HTTP API
- Send HTTP requests to trigger replay
- Requires OBS Studio 28+ with WebSocket enabled

### 3. Custom Desktop Application
- Create a small desktop app that listens for HTTP requests
- Use system APIs to send keypress
- More reliable than web-based solutions

## Security Considerations

- Server-side keypress methods require appropriate permissions
- Consider using OBS WebSocket for production environments
- Test thoroughly in your specific environment
- Consider user permissions and system security policies

## Production Recommendations

1. **Use OBS WebSocket** for most reliable integration
2. **Test thoroughly** in your kiosk environment
3. **Have fallback methods** ready
4. **Monitor logs** for successful keypress delivery
5. **Consider user permissions** for system-level operations
