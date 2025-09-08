const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { db, initDatabase, dbHelpers } = require('./database');
const OBSWebSocketClient = require('./obs-websocket');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration
const REPLAY_DIRECTORY = process.env.REPLAY_DIRECTORY || 'C:/Replays';
const VIDEOS_DIRECTORY = process.env.VIDEOS_DIRECTORY || 'C:/Users/msalm/Videos';

// Ensure replay directory exists
if (!fs.existsSync(REPLAY_DIRECTORY)) {
  fs.mkdirSync(REPLAY_DIRECTORY, { recursive: true });
  console.log(`Created replay directory: ${REPLAY_DIRECTORY}`);
}

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIRECTORY)) {
  fs.mkdirSync(VIDEOS_DIRECTORY, { recursive: true });
  console.log(`Created videos directory: ${VIDEOS_DIRECTORY}`);
}

// Mock payment data storage (in production, this would be handled by Midtrans)
const mockPayments = new Map();

// Initialize OBS WebSocket client
const obsClient = new OBSWebSocketClient();

// Initialize database
initDatabase().then(() => {
  console.log('Database initialized successfully');
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// Session cleanup function
const cleanupExpiredSessions = async () => {
  try {
    // Get all active sessions
    const activeSessions = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM sessions WHERE status = 'active'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const currentTime = new Date();
    
    for (const session of activeSessions) {
      if (session.start_time) {
        const startTime = new Date(session.start_time);
        const elapsedMinutes = (currentTime - startTime) / (1000 * 60);
        
        if (elapsedMinutes >= session.duration_minutes) {
          // Mark session as expired
          await dbHelpers.updateSession(session.id, { status: 'expired' });
          console.log(`Session ${session.session_id} expired and marked as expired`);
          
          // Stop replay buffer and disconnect OBS WebSocket for this session
          if (session.session_id) {
            try {
              // Stop replay buffer before disconnecting
              console.log(`⏹️ Stopping replay buffer for expired session: ${session.session_id}`);
              await obsClient.stopReplayBuffer();
              console.log(`✅ Replay buffer stopped successfully for expired session`);
            } catch (replayBufferError) {
              console.error(`❌ Failed to stop replay buffer for expired session: ${replayBufferError.message}`);
              // Continue with disconnection even if replay buffer stop fails
            }
            
            obsClient.disconnectFromSession(session.session_id);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error during session cleanup:', error);
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

// Run initial cleanup on startup
setTimeout(cleanupExpiredSessions, 10000); // 10 seconds after startup

// API Routes

// Create session endpoint
app.post('/api/create-session', async (req, res) => {
  try {
    const { duration } = req.body;
    
    if (!duration || ![30, 60, 120].includes(duration)) {
      return res.status(400).json({ error: 'Invalid duration. Must be 30, 60, or 120 minutes' });
    }

    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Create session in database
    const session = await dbHelpers.createSession(sessionId, duration);

    res.json({
      sessionId: session.session_id,
      duration: session.duration_minutes,
      status: 'created'
    });

  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Create payment endpoint (legacy - keeping for backward compatibility)
app.post('/api/create-payment', async (req, res) => {
  try {
    const { duration } = req.body;
    
    if (!duration || ![30, 60, 120].includes(duration)) {
      return res.status(400).json({ error: 'Invalid duration. Must be 30, 60, or 120 minutes' });
    }

    // Generate mock order ID
    const orderId = uuidv4();
    
    // Calculate price (mock pricing: $1 per minute)
    const price = duration;
    
    // Create session in database with order ID
    const sessionId = uuidv4();
    const session = await dbHelpers.createSession(sessionId, duration);
    
    // Update session with order ID
    await dbHelpers.updateSession(session.id, { midtrans_order_id: orderId });
    
    // Store mock payment data
    mockPayments.set(orderId, {
      orderId,
      amount: price,
      duration,
      status: 'pending',
      createdAt: new Date()
    });

    // Generate QR code for payment (mock)
    const paymentData = {
      orderId,
      amount: price,
      duration,
      timestamp: new Date().toISOString()
    };

    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(paymentData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      orderId,
      amount: price,
      duration,
      qrCode: qrCodeDataURL,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Check payment status
app.get('/api/payment-status/:order_id', (req, res) => {
  try {
    const { order_id } = req.params;
    const payment = mockPayments.get(order_id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Mock payment success after 5 seconds
    const timeSinceCreation = Date.now() - payment.createdAt.getTime();
    const isSuccess = timeSinceCreation > 5000; // 5 seconds

    if (isSuccess && payment.status === 'pending') {
      payment.status = 'success';
      // Update session status in database
      dbHelpers.getSessionByOrderId(order_id).then(session => {
        if (session) {
          dbHelpers.updateSession(session.id, { status: 'paid' });
        }
      });
    }

    res.json({
      orderId: order_id,
      status: payment.status,
      amount: payment.amount,
      duration: payment.duration
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// Start session
app.put('/api/start-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { session_name } = req.body;

    if (!session_name || session_name.trim().length === 0) {
      return res.status(400).json({ error: 'Session name is required' });
    }

    // First get the session by session_id
    const session = await dbHelpers.getSessionBySessionId(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'created') {
      return res.status(400).json({ error: 'Session is not in created state' });
    }

    const updates = {
      session_name: session_name.trim(),
      status: 'active',
      start_time: new Date().toISOString()
    };

    const result = await dbHelpers.updateSession(session.id, updates);

    if (result.changes === 0) {
      return res.status(500).json({ error: 'Failed to update session' });
    }

    const updatedSession = await dbHelpers.getSession(session.id);

    // Create session-specific folder in C:/Replays/
    const sessionFolderName = `${session_name.trim()}_${sessionId}`;
    const sessionFolderPath = path.join(REPLAY_DIRECTORY, sessionFolderName);
    
    try {
      if (!fs.existsSync(sessionFolderPath)) {
        fs.mkdirSync(sessionFolderPath, { recursive: true });
        console.log(`📁 Created session folder: ${sessionFolderPath}`);
      } else {
        console.log(`📁 Session folder already exists: ${sessionFolderPath}`);
      }
    } catch (folderError) {
      console.error(`❌ Failed to create session folder: ${folderError.message}`);
      // Continue with session creation even if folder creation fails
    }

    // Establish OBS WebSocket connection for this session
    console.log(`🎬 Establishing OBS connection for session: ${updatedSession.session_id}`);
    const obsConnectionResult = await obsClient.connectForSession(updatedSession.session_id);
    
    let obsPathSetResult = { success: false, message: 'OBS not connected' };
    
    if (obsConnectionResult.success) {
      // Set OBS recording directory to the session folder (this affects both recordings and replay buffers)
      try {
        console.log(`🎯 Setting OBS recording directory to: ${sessionFolderPath}`);
        console.log(`📝 This will make both recordings and replay buffers save to: ${sessionFolderPath}`);
        obsPathSetResult = await obsClient.setReplayBufferPath(sessionFolderPath);
        console.log(`✅ OBS recording directory set successfully - both recordings and replay buffers will now save to session folder`);
        
        // Verify the recording directory was set correctly
        try {
          const currentFolder = await obsClient.getRecordingFolder();
          console.log(`🔍 Current OBS recording directory: ${currentFolder['rec-folder'] || 'Unknown'}`);
          if (currentFolder['rec-folder'] === sessionFolderPath) {
            console.log(`✅ Recording directory verification successful!`);
          } else {
            console.warn(`⚠️ Recording directory mismatch. Expected: ${sessionFolderPath}, Got: ${currentFolder['rec-folder']}`);
          }
        } catch (verifyError) {
          console.warn(`⚠️ Could not verify recording directory: ${verifyError.message}`);
        }

        // Start/restart replay buffer for the session
        try {
          console.log(`🎬 Managing replay buffer for session...`);
          
          // Check if replay buffer is already running
          const replayBufferStatus = await obsClient.getReplayBufferStatus();
          const isReplayBufferActive = replayBufferStatus['outputActive'] || false;
          
          if (isReplayBufferActive) {
            console.log(`🔄 Replay buffer is already running, stopping it first...`);
            await obsClient.stopReplayBuffer();
            console.log(`⏹️ Replay buffer stopped successfully`);
          }
          
          // Start replay buffer for the new session
          console.log(`▶️ Starting replay buffer for session...`);
          const startResult = await obsClient.startReplayBuffer();
          console.log(`✅ Replay buffer started successfully for session`);
          
        } catch (replayBufferError) {
          console.error(`❌ Failed to manage replay buffer: ${replayBufferError.message}`);
          // Don't fail the session creation if replay buffer management fails
        }
      } catch (pathError) {
        console.error(`❌ Failed to set OBS recording directory: ${pathError.message}`);
        obsPathSetResult = { success: false, message: pathError.message };
      }
    } else {
      console.error(`❌ OBS connection failed for session ${updatedSession.session_id}: ${obsConnectionResult.message}`);
      console.error('🔧 Please check:');
      console.error('   1. OBS Studio is running');
      console.error('   2. OBS WebSocket plugin is enabled');
      console.error('   3. WebSocket server is running on port 4455');
      console.error('   4. Password is correct: pHZSML4D00NHdL8d');
      console.error('   5. Firewall allows connections to OBS');
    }

    res.json({
      id: updatedSession.id,
      session_id: updatedSession.session_id,
      session_name: updatedSession.session_name,
      duration_minutes: updatedSession.duration_minutes,
      start_time: updatedSession.start_time,
      status: updatedSession.status,
      obs_connected: obsConnectionResult.success,
      obs_path_set: obsPathSetResult.success,
      session_folder_path: sessionFolderPath,
      session_folder_name: sessionFolderName
    });

  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// End session manually
app.put('/api/end-session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await dbHelpers.getSession(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Update session status to expired
    await dbHelpers.updateSession(id, { status: 'expired' });
    
    // Stop replay buffer and disconnect OBS WebSocket for this session
    if (session.session_id) {
      try {
        // Stop replay buffer before disconnecting
        console.log(`⏹️ Stopping replay buffer for ended session: ${session.session_id}`);
        await obsClient.stopReplayBuffer();
        console.log(`✅ Replay buffer stopped successfully for ended session`);
      } catch (replayBufferError) {
        console.error(`❌ Failed to stop replay buffer for ended session: ${replayBufferError.message}`);
        // Continue with disconnection even if replay buffer stop fails
      }
      
      obsClient.disconnectFromSession(session.session_id);
      console.log(`🔌 Disconnected OBS WebSocket for ended session: ${session.session_id}`);
    }

    res.json({
      id: session.id,
      session_id: session.session_id,
      session_name: session.session_name,
      status: 'expired',
      message: 'Session ended successfully'
    });

  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Get session details
app.get('/api/session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to get session by database ID first, then by session_id
    let session = await dbHelpers.getSession(id);
    
    // If not found by database ID, try by session_id (UUID)
    if (!session) {
      session = await dbHelpers.getSessionBySessionId(id);
    }
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if session has expired
    if (session.status === 'active' && session.start_time) {
      const startTime = new Date(session.start_time);
      const currentTime = new Date();
      const elapsedMinutes = (currentTime - startTime) / (1000 * 60);
      
      if (elapsedMinutes >= session.duration_minutes) {
        // Mark session as expired
        await dbHelpers.updateSession(id, { status: 'expired' });
        session.status = 'expired';
      }
    }

    // Check OBS connection status for this session
    const obsConnected = obsClient.isConnectedForSession(session.session_id);

    // Generate session folder information
    const sessionFolderName = session.session_name ? `${session.session_name}_${session.session_id}` : null;
    const sessionFolderPath = sessionFolderName ? path.join(REPLAY_DIRECTORY, sessionFolderName) : null;

    res.json({
      id: session.id,
      session_id: session.session_id,
      session_name: session.session_name,
      duration_minutes: session.duration_minutes,
      start_time: session.start_time,
      status: session.status,
      created_at: session.created_at,
      obs_connected: obsConnected,
      session_folder_path: sessionFolderPath,
      session_folder_name: sessionFolderName
    });

  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Get gallery videos
app.get('/api/gallery-videos/:sessionId?', async (req, res) => {
  try {
    const { sessionId } = req.params;
    let videosDirectory = VIDEOS_DIRECTORY; // Default directory
    let sessionInfo = null;

    // Session ID is required for gallery access
    if (!sessionId) {
      return res.status(400).json({ 
        error: 'Session ID required',
        message: 'Gallery access requires a valid session ID'
      });
    }

    // Look up session and validate it exists
    try {
      console.log(`🔍 Looking up session with ID: ${sessionId}`);
      const session = await dbHelpers.getSessionBySessionId(sessionId);
      console.log(`📊 Session lookup result:`, JSON.stringify(session, null, 2));
      
      if (!session) {
        return res.status(404).json({ 
          error: 'Session not found',
          message: `Session ${sessionId} does not exist`
        });
      }

      if (!session.session_name) {
        return res.status(400).json({ 
          error: 'Invalid session',
          message: 'Session does not have a valid name'
        });
      }

      // Check if session is active
      if (session.status !== 'active') {
        return res.status(403).json({ 
          error: 'Session not active',
          message: `Session is ${session.status}. Only active sessions can access gallery.`
        });
      }

      const sessionFolderName = `${session.session_name}_${session.session_id}`;
      const sessionFolderPath = path.join(REPLAY_DIRECTORY, sessionFolderName);
      
      console.log(`📁 Session folder name: ${sessionFolderName}`);
      console.log(`📁 Session folder path: ${sessionFolderPath}`);
      console.log(`📁 REPLAY_DIRECTORY: ${REPLAY_DIRECTORY}`);
      console.log(`📁 Folder exists check: ${fs.existsSync(sessionFolderPath)}`);
      
      if (!fs.existsSync(sessionFolderPath)) {
        console.log(`⚠️ Session folder does not exist: ${sessionFolderPath}`);
        console.log(`📁 Available folders in ${REPLAY_DIRECTORY}:`);
        try {
          const folders = fs.readdirSync(REPLAY_DIRECTORY);
          folders.forEach(folder => {
            const fullPath = path.join(REPLAY_DIRECTORY, folder);
            const isDir = fs.statSync(fullPath).isDirectory();
            console.log(`  - ${folder} (${isDir ? 'directory' : 'file'})`);
          });
        } catch (readError) {
          console.log(`❌ Cannot read directory ${REPLAY_DIRECTORY}:`, readError.message);
        }
        return res.status(404).json({ 
          error: 'Session folder not found',
          message: `Session folder does not exist: ${sessionFolderPath}`
        });
      }

      // Use session-specific directory
      videosDirectory = sessionFolderPath;
      sessionInfo = {
        session_name: session.session_name,
        session_id: session.session_id,
        folder_path: sessionFolderPath
      };
      console.log(`✅ Using session-specific directory: ${sessionFolderPath}`);

    } catch (sessionError) {
      console.error(`❌ Error getting session ${sessionId}:`, sessionError.message);
      console.error(`❌ Full error:`, sessionError);
      return res.status(500).json({ 
        error: 'Failed to validate session',
        message: sessionError.message
      });
    }
    
    console.log(`📁 Checking videos directory: ${videosDirectory}`);
    
    if (!fs.existsSync(videosDirectory)) {
      console.log(`❌ Videos directory does not exist: ${videosDirectory}`);
      return res.json({
        videos: [],
        session_info: sessionInfo,
        directory: videosDirectory
      });
    }

    const files = fs.readdirSync(videosDirectory);
    console.log(`📋 Found ${files.length} total files in directory`);
    
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      const isVideo = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.wmv', '.flv', '.m4v'].includes(ext);
      if (isVideo) {
        console.log(`🎬 Video file found: ${file}`);
      }
      return isVideo;
    }).map(file => {
      const filePath = path.join(videosDirectory, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        name: path.parse(file).name,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    }).sort((a, b) => b.created - a.created); // Sort by newest first

    console.log(`✅ Found ${videoFiles.length} video files in ${videosDirectory}`);
    res.json({
      videos: videoFiles,
      session_info: sessionInfo,
      directory: videosDirectory
    });

  } catch (error) {
    console.error('Error reading gallery videos:', error);
    res.status(500).json({ error: 'Failed to read gallery videos' });
  }
});

// Serve video files
app.get('/api/video/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { sessionId } = req.query; // Optional session ID parameter
    const decodedFilename = decodeURIComponent(filename);
    
    let videoPath = path.join(VIDEOS_DIRECTORY, decodedFilename); // Default path
    
    // If sessionId is provided, try to find video in session folder first
    if (sessionId) {
      try {
        const session = await dbHelpers.getSessionBySessionId(sessionId);
        if (session && session.session_name) {
          const sessionFolderName = `${session.session_name}_${session.session_id}`;
          const sessionFolderPath = path.join(REPLAY_DIRECTORY, sessionFolderName);
          const sessionVideoPath = path.join(sessionFolderPath, decodedFilename);
          
          if (fs.existsSync(sessionVideoPath)) {
            videoPath = sessionVideoPath;
            console.log(`🎬 Video found in session folder: ${sessionVideoPath}`);
          } else {
            console.log(`📁 Video not found in session folder, trying default directory`);
          }
        }
      } catch (sessionError) {
        console.error(`❌ Error getting session for video:`, sessionError.message);
      }
    }

    console.log(`🎬 Video request: ${filename}`);
    console.log(`📁 Decoded filename: ${decodedFilename}`);
    console.log(`📁 Full path: ${videoPath}`);
    console.log(`📁 File exists: ${fs.existsSync(videoPath)}`);

    // Security check: ensure the file exists
    if (!fs.existsSync(videoPath)) {
      console.log(`❌ Video not found: ${decodedFilename}`);
      return res.status(404).json({ error: 'Video not found', filename: decodedFilename });
    }

    // Set appropriate headers for video streaming
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range requests for video streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Serve entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }

  } catch (error) {
    console.error('Error serving video:', error);
    res.status(500).json({ error: 'Failed to serve video' });
  }
});

// OBS WebSocket connection status endpoint
app.get('/api/obs/status', async (req, res) => {
  try {
    // Get current status without creating new connections
    const status = obsClient.getStatus();
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get OBS WebSocket status',
      message: error.message
    });
  }
});

// OBS WebSocket API endpoint for saving replay buffer
app.post('/api/obs/save-replay/:sessionId?', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`🎬 Attempting to save OBS replay buffer via WebSocket for session: ${sessionId || 'unknown'}...`);
    
    // Validate session exists if sessionId is provided
    if (sessionId) {
      const session = await dbHelpers.getSessionBySessionId(sessionId);
      if (!session) {
        return res.status(404).json({ 
          error: 'Session not found',
          message: `Session ${sessionId} does not exist`
        });
      }
      
      if (session.status !== 'active') {
        return res.status(403).json({ 
          error: 'Session not active',
          message: `Session ${sessionId} is not active (status: ${session.status})`
        });
      }
    }
    
    // Check if we have an active session connection
    if (sessionId && !obsClient.isConnectedForSession(sessionId)) {
      console.log(`⚠️ No active OBS connection for session ${sessionId}, attempting to reconnect...`);
      const connectionResult = await obsClient.connectForSession(sessionId);
      if (!connectionResult.success) {
        throw new Error(`OBS connection failed: ${connectionResult.message}`);
      }
      console.log(`✅ OBS connection established for session ${sessionId}`);
    }
    
    // Try to save replay buffer using OBS WebSocket
    console.log('📤 Sending save replay buffer request to OBS...');
    const result = await obsClient.saveReplayBuffer();
    
    console.log('✅ OBS replay buffer saved successfully:', result);
    res.json({ 
      success: true, 
      message: 'Replay buffer saved successfully!',
      data: result,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      method: 'OBS WebSocket'
    });
    
  } catch (error) {
    console.error('❌ Error with OBS WebSocket:', error);
    
    // Provide more specific error responses
    let statusCode = 500;
    let errorMessage = 'Failed to save replay buffer';
    
    if (error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'OBS connection timeout - check if OBS is running';
    } else if (error.message.includes('not running')) {
      statusCode = 503;
      errorMessage = 'OBS Studio is not running';
    } else if (error.message.includes('replay buffer')) {
      statusCode = 400;
      errorMessage = 'Replay buffer configuration issue in OBS. Check OBS Settings > Output > Replay Buffer is enabled and configured.';
    } else if (error.message.includes('connection')) {
      statusCode = 503;
      errorMessage = 'OBS WebSocket connection failed';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      message: error.message,
      fallback: 'Try using F9 keypress method instead',
      session_id: req.params.sessionId,
      timestamp: new Date().toISOString()
    });
  }
});

// Trigger F9 keypress for OBS replay buffer (fallback method)
app.post('/api/trigger-replay', (req, res) => {
  try {
    // Method 1: Try using robotjs for system-level keypress (requires installation)
    // npm install robotjs
    try {
      const robot = require('robotjs');
      robot.keyTap('f9');
      console.log('F9 keypress sent via robotjs');
    } catch (robotError) {
      console.log('robotjs not available, trying alternative method');
      
      // Method 2: Try using child_process to send keypress
      const { exec } = require('child_process');
      
      // For Windows
      if (process.platform === 'win32') {
        exec('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'{F9}\')"', (error) => {
          if (error) {
            console.log('Windows keypress method failed:', error.message);
          } else {
            console.log('F9 keypress sent via Windows SendKeys');
          }
        });
      }
      // For macOS
      else if (process.platform === 'darwin') {
        exec('osascript -e "tell application \\"System Events\\" to key code 99"', (error) => {
          if (error) {
            console.log('macOS keypress method failed:', error.message);
          } else {
            console.log('F9 keypress sent via macOS AppleScript');
          }
        });
      }
      // For Linux
      else {
        exec('xdotool key F9', (error) => {
          if (error) {
            console.log('Linux keypress method failed:', error.message);
          } else {
            console.log('F9 keypress sent via xdotool');
          }
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: 'F9 keypress triggered for OBS replay buffer',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error triggering F9 keypress:', error);
    res.status(500).json({ 
      error: 'Failed to trigger F9 keypress',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database inspection endpoint (for development)
app.get('/api/db/inspect', async (req, res) => {
  try {
    // Get all sessions
    const sessions = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM sessions ORDER BY created_at DESC", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get session statistics
    const stats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(duration_minutes) as avg_duration
        FROM sessions 
        GROUP BY status
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      sessions,
      statistics: stats,
      total_sessions: sessions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error inspecting database:', error);
    res.status(500).json({ error: 'Failed to inspect database' });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Replay directory: ${REPLAY_DIRECTORY}`);
  console.log(`Videos directory: ${VIDEOS_DIRECTORY}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  // Disconnect OBS WebSocket client
  obsClient.disconnect();
  
  // Close the server
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle different termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});
