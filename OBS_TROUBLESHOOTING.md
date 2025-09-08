# OBS WebSocket Troubleshooting Guide

## Current Configuration
- **Server IP**: 192.168.1.9
- **Port**: 4455
- **Password**: pHZSML4D00NHdL8d

## Connection Test Results
- ✅ **Network Connectivity**: IP 192.168.1.9 is reachable (ping successful)
- ❌ **WebSocket Connection**: Connection timeout (port 4455 not responding)

## Troubleshooting Steps

### 1. Check OBS WebSocket Server Status

**On the OBS machine (192.168.1.9):**

1. **Verify OBS WebSocket Plugin is Installed**:
   - Open OBS Studio
   - Go to **Tools** → **WebSocket Server Settings**
   - If this option is not available, install the WebSocket plugin

2. **Check WebSocket Server Configuration**:
   - **Enable WebSocket server**: ✅ Checked
   - **Server Port**: 4455
   - **Server Password**: pHZSML4D00NHdL8d
   - **Enable Authentication**: ✅ Checked (if password is set)

3. **Verify Server is Running**:
   - Look for "WebSocket server started" message in OBS logs
   - Check if port 4455 is listening: `netstat -an | findstr 4455`

### 2. Network and Firewall Issues

**On the OBS machine (192.168.1.9):**

1. **Windows Firewall**:
   ```cmd
   # Allow OBS through firewall
   netsh advfirewall firewall add rule name="OBS WebSocket" dir=in action=allow protocol=TCP localport=4455
   ```

2. **Check if Port is Listening**:
   ```cmd
   netstat -an | findstr 4455
   # Should show: TCP 0.0.0.0:4455 LISTENING
   ```

3. **Test Local Connection**:
   ```cmd
   telnet localhost 4455
   # Should connect successfully
   ```

### 3. OBS WebSocket Plugin Issues

**If WebSocket plugin is not working:**

1. **Download Latest Plugin**:
   - Go to: https://github.com/obsproject/obs-websocket/releases
   - Download the latest version for your OBS version

2. **Installation Steps**:
   - Close OBS Studio
   - Extract the plugin files
   - Copy to OBS plugins directory
   - Restart OBS Studio

3. **Verify Installation**:
   - Check **Tools** → **WebSocket Server Settings** is available
   - Look for WebSocket plugin in **Tools** menu

### 4. Alternative Connection Methods

**If WebSocket continues to fail, use these alternatives:**

1. **F9 Keypress Method** (Current Fallback):
   - The application automatically falls back to F9 keypress
   - Ensure OBS is configured to save replay buffer on F9
   - This method works even without WebSocket

2. **OBS HTTP API** (Alternative):
   - Some OBS versions support HTTP API
   - Can be configured in WebSocket settings

### 5. Testing Commands

**Test from the kiosk machine:**

1. **Test Network Connectivity**:
   ```cmd
   ping 192.168.1.9
   ```

2. **Test Port Connectivity**:
   ```cmd
   telnet 192.168.1.9 4455
   ```

3. **Test WebSocket Connection**:
   ```cmd
   cd server
   node test-obs-connection.js
   ```

4. **Test API Endpoint**:
   ```cmd
   curl http://localhost:3001/api/obs/status
   ```

### 6. Common Issues and Solutions

**Issue**: "Connection timeout"
- **Cause**: OBS WebSocket server not running
- **Solution**: Enable WebSocket server in OBS settings

**Issue**: "Connection refused"
- **Cause**: Firewall blocking port 4455
- **Solution**: Add firewall rule for port 4455

**Issue**: "Authentication failed"
- **Cause**: Wrong password or authentication not enabled
- **Solution**: Check password in OBS WebSocket settings

**Issue**: "WebSocket plugin not found"
- **Cause**: Plugin not installed
- **Solution**: Install OBS WebSocket plugin

### 7. Manual Testing

**Test WebSocket connection manually:**

1. **Using Browser**:
   ```javascript
   const ws = new WebSocket('ws://192.168.1.9:4455');
   ws.onopen = () => console.log('Connected');
   ws.onerror = (error) => console.log('Error:', error);
   ```

2. **Using PowerShell**:
   ```powershell
   Test-NetConnection -ComputerName 192.168.1.9 -Port 4455
   ```

### 8. Production Setup

**For reliable production use:**

1. **Use Static IP**: Ensure OBS machine has static IP
2. **Firewall Rules**: Configure proper firewall rules
3. **Monitoring**: Set up connection monitoring
4. **Backup Method**: Always have F9 keypress as fallback
5. **Logging**: Enable detailed logging for troubleshooting

## Current Status

- ✅ **Network**: IP 192.168.1.9 is reachable
- ❌ **WebSocket**: Port 4455 not responding
- ✅ **Fallback**: F9 keypress method available
- ✅ **Application**: Handles connection failures gracefully

## Next Steps

1. **Check OBS WebSocket Server**: Verify it's running on 192.168.1.9:4455
2. **Check Firewall**: Ensure port 4455 is open
3. **Test Locally**: Test WebSocket connection from OBS machine
4. **Use Fallback**: F9 keypress method works as backup

The application is designed to work with or without WebSocket connection, so the F9 keypress fallback ensures replay capture functionality remains available.
