const WebSocket = require('ws');

class OBSWebSocketClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.authenticated = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.shouldReconnect = false; // Only reconnect when explicitly requested
    this.reconnectTimeout = null;
    this.sessionId = null; // Track which session is using this connection
    this.connectionPromise = null; // Track ongoing connection attempts
    
    // OBS WebSocket configuration
    this.url = process.env.OBS_WEBSOCKET_URL || 'ws://192.168.1.5:4455';
    this.password = process.env.OBS_WEBSOCKET_PASSWORD || 'pHZSML4D00NHdL8d';
  }

  // Connect for a specific session
  async connectForSession(sessionId) {
    console.log(`🔗 Connecting to OBS WebSocket for session: ${sessionId}`);
    
    // If already connected for this session, return success
    if (this.connected && this.authenticated && this.sessionId === sessionId) {
      console.log('✅ OBS WebSocket already connected for this session');
      return { success: true, message: 'Already connected for this session' };
    }
    
    // If there's an ongoing connection attempt, wait for it
    if (this.connectionPromise) {
      console.log('⏳ Waiting for ongoing OBS connection attempt...');
      try {
        await this.connectionPromise;
        if (this.connected && this.authenticated) {
          this.sessionId = sessionId;
          return { success: true, message: 'Connected via existing attempt' };
        }
      } catch (error) {
        console.log('❌ Previous connection attempt failed, starting new one...');
      }
    }
    
    // Start new connection with timeout
    this.sessionId = sessionId;
    this.shouldReconnect = true; // Enable reconnection for active sessions
    this.connectionPromise = this.connect();
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
      });
      
      await Promise.race([this.connectionPromise, timeoutPromise]);
      this.connectionPromise = null;
      console.log(`✅ OBS WebSocket connected successfully for session: ${sessionId}`);
      return { success: true, message: 'Connected successfully' };
    } catch (error) {
      this.connectionPromise = null;
      this.shouldReconnect = false; // Disable reconnection on connection failure
      console.log(`❌ Failed to connect OBS WebSocket for session: ${sessionId}`, error.message);
      return { success: false, message: error.message };
    }
  }

  // Disconnect from current session
  disconnectFromSession(sessionId) {
    if (this.sessionId === sessionId) {
      console.log(`🔌 Disconnecting OBS WebSocket from session: ${sessionId}`);
      this.sessionId = null;
      this.shouldReconnect = false; // Disable reconnection when session ends
      this.disconnect();
    }
  }

  // Check if connected for a specific session
  isConnectedForSession(sessionId) {
    return this.connected && this.authenticated && this.sessionId === sessionId;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.authenticated = false;
        
        this.ws.on('open', () => {
          console.log('Connected to OBS WebSocket');
          this.connected = true;
          this.reconnectAttempts = 0;
          // Don't resolve yet - wait for authentication
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing OBS WebSocket message:', error);
          }
        });

        this.ws.on('close', () => {
          console.log('OBS WebSocket connection closed');
          this.connected = false;
          this.authenticated = false;
          this.attemptReconnect();
        });

        this.ws.on('error', (error) => {
          console.error('OBS WebSocket error:', error);
          this.connected = false;
          this.authenticated = false;
          reject(error);
        });

        // Set up authentication promise
        this.authPromise = new Promise((authResolve, authReject) => {
          this.authResolve = authResolve;
          this.authReject = authReject;
        });

        // Wait for authentication to complete
        this.authPromise.then(() => {
          resolve();
        }).catch((error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  handleMessage(message) {
    console.log('OBS WebSocket message received:', JSON.stringify(message, null, 2));
    
    // Handle OBS WebSocket messages
    if (message.op === 0) { // Hello message
      this.handleHello(message);
    } else if (message.op === 2) { // Identified message
      this.handleIdentified(message);
    } else if (message.op === 5) { // Event message
      this.handleEvent(message);
    } else if (message.op === 7) { // RequestResponse message
      this.handleRequestResponse(message);
    } else if (message.op === 1) { // Identify response (error)
      this.handleIdentifyError(message);
    }
  }

  handleHello(message) {
    console.log('OBS WebSocket hello received');
    
    // Send identify message with authentication
    this.identify(message);
  }

  identify(helloMessage) {
    const crypto = require('crypto');
    
    // Generate authentication hash using the challenge and salt from OBS
    const authData = helloMessage.d.authentication;
    const challenge = authData.challenge;
    const salt = authData.salt;
    
    // Create authentication hash
    const authString = this.password + salt;
    const authHash = crypto.createHash('sha256').update(authString).digest('base64');
    const authResponse = crypto.createHash('sha256').update(authHash + challenge).digest('base64');
    
    const identifyData = {
      op: 1,
      d: {
        rpcVersion: helloMessage.d.rpcVersion,
        authentication: authResponse
      }
    };
    
    console.log('Sending identify message with proper authentication hash');
    this.send(identifyData);
  }

  handleIdentified(message) {
    console.log('OBS WebSocket identified successfully');
    this.authenticated = true;
    this.connected = true;
    
    // Resolve the authentication promise
    if (this.authResolve) {
      this.authResolve();
    }
  }

  handleIdentifyError(message) {
    console.error('OBS WebSocket identification failed:', message);
    this.authenticated = false;
    this.shouldReconnect = false; // Stop reconnection attempts on auth failure
    
    // Reject the authentication promise
    if (this.authReject) {
      this.authReject(new Error('OBS WebSocket authentication failed: ' + JSON.stringify(message)));
    }
  }

  handleEvent(message) {
    // Handle OBS events (like replay buffer saved)
    if (message.d.eventType === 'ReplayBufferSaved') {
      console.log('OBS replay buffer saved event received');
    }
  }

  handleRequestResponse(message) {
    // Handle request responses
    console.log('OBS WebSocket request response:', message.d);
  }

  send(data) {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify(data));
    } else {
      throw new Error('OBS WebSocket not connected');
    }
  }

  async setReplayBufferPath(outputPath) {
    console.log('setReplayBufferPath called, connected:', this.connected, 'authenticated:', this.authenticated);
    
    if (!this.connected || !this.authenticated) {
      console.log('Not connected or authenticated, establishing session...');
      await this.connect(); // This will wait for full authentication
    }

    console.log('Session established, setting recording directory to session folder...');

    // Step 1: Set the main recording directory to the session folder
    const setRecordDirRequestId = Date.now().toString();
    const setRecordDirRequest = {
      op: 6,
      d: {
        requestType: 'SetRecordDirectory',
        requestId: setRecordDirRequestId,
        requestData: {
          'recordDirectory': outputPath
        }
      }
    };

    console.log('Sending SetRecordDirectory request:', JSON.stringify(setRecordDirRequest, null, 2));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('OBS WebSocket request timeout - no response received');
        reject(new Error('OBS WebSocket request timeout - check if OBS is running'));
      }, 10000);

      const handleResponse = (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received response:', JSON.stringify(data, null, 2));
          
          if (data.op === 7 && data.d.requestId === setRecordDirRequestId) {
            clearTimeout(timeout);
            this.ws.removeListener('message', handleResponse);
            
            if (data.d.requestStatus.code === 100) {
              console.log('Recording directory set successfully to:', outputPath);
              console.log('✅ Both recordings and replay buffers will now save to session folder');
              resolve(data.d.responseData || { success: true });
            } else {
              console.log('Recording directory set failed:', data.d.requestStatus.comment);
              reject(new Error(data.d.requestStatus.comment || 'Unknown error'));
            }
          }
        } catch (error) {
          console.error('Error handling OBS response:', error);
        }
      };

      this.ws.on('message', handleResponse);
      this.send(setRecordDirRequest);
    });
  }

  async getReplayBufferSettings() {
    console.log('getReplayBufferSettings called, connected:', this.connected, 'authenticated:', this.authenticated);
    
    if (!this.connected || !this.authenticated) {
      console.log('Not connected or authenticated, establishing session...');
      await this.connect(); // This will wait for full authentication
    }

    console.log('Session established, sending GetReplayBufferSettings request...');

    const requestId = Date.now().toString();
    const request = {
      op: 6,
      d: {
        requestType: 'GetReplayBufferSettings',
        requestId: requestId
      }
    };

    console.log('Sending GetReplayBufferSettings request:', JSON.stringify(request, null, 2));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('OBS WebSocket request timeout - no response received');
        reject(new Error('OBS WebSocket request timeout - check if OBS is running'));
      }, 10000);

      const handleResponse = (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received response:', JSON.stringify(data, null, 2));
          
          if (data.op === 7 && data.d.requestId === requestId) {
            clearTimeout(timeout);
            this.ws.removeListener('message', handleResponse);
            
            if (data.d.requestStatus.code === 100) {
              console.log('Replay buffer settings retrieved successfully:', data.d.responseData);
              resolve(data.d.responseData || {});
            } else {
              console.log('Replay buffer settings retrieval failed:', data.d.requestStatus.comment);
              reject(new Error(data.d.requestStatus.comment || 'Unknown error'));
            }
          }
        } catch (error) {
          console.error('Error handling OBS response:', error);
        }
      };

      this.ws.on('message', handleResponse);
      this.send(request);
    });
  }

  async getRecordingFolder() {
    console.log('getRecordingFolder called, connected:', this.connected, 'authenticated:', this.authenticated);
    
    if (!this.connected || !this.authenticated) {
      console.log('Not connected or authenticated, establishing session...');
      await this.connect(); // This will wait for full authentication
    }

    console.log('Session established, sending GetRecordingFolder request...');

    const requestId = Date.now().toString();
    const request = {
      op: 6,
      d: {
        requestType: 'GetRecordingFolder',
        requestId: requestId
      }
    };

    console.log('Sending GetRecordingFolder request:', JSON.stringify(request, null, 2));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('OBS WebSocket request timeout - no response received');
        reject(new Error('OBS WebSocket request timeout - check if OBS is running'));
      }, 10000);

      const handleResponse = (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received response:', JSON.stringify(data, null, 2));
          
          if (data.op === 7 && data.d.requestId === requestId) {
            clearTimeout(timeout);
            this.ws.removeListener('message', handleResponse);
            
            if (data.d.requestStatus.code === 100) {
              console.log('Recording folder retrieved successfully:', data.d.responseData);
              resolve(data.d.responseData || {});
            } else {
              console.log('Recording folder retrieval failed:', data.d.requestStatus.comment);
              reject(new Error(data.d.requestStatus.comment || 'Unknown error'));
            }
          }
        } catch (error) {
          console.error('Error handling OBS response:', error);
        }
      };

      this.ws.on('message', handleResponse);
      this.send(request);
    });
  }

  async startReplayBuffer() {
    console.log('startReplayBuffer called, connected:', this.connected, 'authenticated:', this.authenticated);
    
    if (!this.connected || !this.authenticated) {
      console.log('Not connected or authenticated, establishing session...');
      await this.connect(); // This will wait for full authentication
    }

    console.log('Session established, sending StartReplayBuffer request...');

    const requestId = Date.now().toString();
    const request = {
      op: 6,
      d: {
        requestType: 'StartReplayBuffer',
        requestId: requestId
      }
    };

    console.log('Sending StartReplayBuffer request:', JSON.stringify(request, null, 2));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('OBS WebSocket request timeout - no response received');
        reject(new Error('OBS WebSocket request timeout - check if OBS is running'));
      }, 10000);

      const handleResponse = (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received response:', JSON.stringify(data, null, 2));
          
          if (data.op === 7 && data.d.requestId === requestId) {
            clearTimeout(timeout);
            this.ws.removeListener('message', handleResponse);
            
            if (data.d.requestStatus.code === 100) {
              console.log('Replay buffer started successfully');
              resolve(data.d.responseData || { success: true });
            } else {
              console.log('Replay buffer start failed:', data.d.requestStatus.comment);
              reject(new Error(data.d.requestStatus.comment || 'Unknown error'));
            }
          }
        } catch (error) {
          console.error('Error handling OBS response:', error);
        }
      };

      this.ws.on('message', handleResponse);
      this.send(request);
    });
  }

  async stopReplayBuffer() {
    console.log('stopReplayBuffer called, connected:', this.connected, 'authenticated:', this.authenticated);
    
    if (!this.connected || !this.authenticated) {
      console.log('Not connected or authenticated, establishing session...');
      await this.connect(); // This will wait for full authentication
    }

    console.log('Session established, sending StopReplayBuffer request...');

    const requestId = Date.now().toString();
    const request = {
      op: 6,
      d: {
        requestType: 'StopReplayBuffer',
        requestId: requestId
      }
    };

    console.log('Sending StopReplayBuffer request:', JSON.stringify(request, null, 2));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('OBS WebSocket request timeout - no response received');
        reject(new Error('OBS WebSocket request timeout - check if OBS is running'));
      }, 10000);

      const handleResponse = (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received response:', JSON.stringify(data, null, 2));
          
          if (data.op === 7 && data.d.requestId === requestId) {
            clearTimeout(timeout);
            this.ws.removeListener('message', handleResponse);
            
            if (data.d.requestStatus.code === 100) {
              console.log('Replay buffer stopped successfully');
              resolve(data.d.responseData || { success: true });
            } else {
              console.log('Replay buffer stop failed:', data.d.requestStatus.comment);
              reject(new Error(data.d.requestStatus.comment || 'Unknown error'));
            }
          }
        } catch (error) {
          console.error('Error handling OBS response:', error);
        }
      };

      this.ws.on('message', handleResponse);
      this.send(request);
    });
  }

  async getReplayBufferStatus() {
    console.log('getReplayBufferStatus called, connected:', this.connected, 'authenticated:', this.authenticated);
    
    if (!this.connected || !this.authenticated) {
      console.log('Not connected or authenticated, establishing session...');
      await this.connect(); // This will wait for full authentication
    }

    console.log('Session established, sending GetReplayBufferStatus request...');

    const requestId = Date.now().toString();
    const request = {
      op: 6,
      d: {
        requestType: 'GetReplayBufferStatus',
        requestId: requestId
      }
    };

    console.log('Sending GetReplayBufferStatus request:', JSON.stringify(request, null, 2));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('OBS WebSocket request timeout - no response received');
        reject(new Error('OBS WebSocket request timeout - check if OBS is running'));
      }, 10000);

      const handleResponse = (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received response:', JSON.stringify(data, null, 2));
          
          if (data.op === 7 && data.d.requestId === requestId) {
            clearTimeout(timeout);
            this.ws.removeListener('message', handleResponse);
            
            if (data.d.requestStatus.code === 100) {
              console.log('Replay buffer status retrieved successfully:', data.d.responseData);
              resolve(data.d.responseData || {});
            } else {
              console.log('Replay buffer status retrieval failed:', data.d.requestStatus.comment);
              reject(new Error(data.d.requestStatus.comment || 'Unknown error'));
            }
          }
        } catch (error) {
          console.error('Error handling OBS response:', error);
        }
      };

      this.ws.on('message', handleResponse);
      this.send(request);
    });
  }

  async saveReplayBuffer() {
    console.log('saveReplayBuffer called, connected:', this.connected, 'authenticated:', this.authenticated);
    
    if (!this.connected || !this.authenticated) {
      console.log('Not connected or authenticated, establishing session...');
      await this.connect(); // This will wait for full authentication
    }

    // Check if replay buffer is actually running before attempting to save
    try {
      console.log('🔍 Checking replay buffer status before saving...');
      const replayBufferStatus = await this.getReplayBufferStatus();
      console.log('📊 Replay buffer status response:', JSON.stringify(replayBufferStatus, null, 2));
      
      const isReplayBufferActive = replayBufferStatus['outputActive'] || false;
      console.log(`📈 Replay buffer active status: ${isReplayBufferActive}`);
      
      if (!isReplayBufferActive) {
        console.log('⚠️ Replay buffer is not active, attempting to start it...');
        try {
          const startResult = await this.startReplayBuffer();
          console.log('🚀 Start replay buffer result:', JSON.stringify(startResult, null, 2));
          
          // Wait a moment for the replay buffer to initialize
          console.log('⏳ Waiting for replay buffer to initialize...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Increased wait time
          
          // Verify it's now active
          console.log('🔍 Verifying replay buffer is now active...');
          const newStatus = await this.getReplayBufferStatus();
          console.log('📊 New replay buffer status:', JSON.stringify(newStatus, null, 2));
          
          const isNowActive = newStatus['outputActive'] || false;
          console.log(`📈 Replay buffer active after start attempt: ${isNowActive}`);
          
          if (!isNowActive) {
            throw new Error('Failed to start replay buffer - it may not be configured in OBS. Check OBS Settings > Output > Replay Buffer is enabled.');
          }
          
          console.log('✅ Replay buffer started successfully');
        } catch (startError) {
          console.error('❌ Failed to start replay buffer:', startError.message);
          throw new Error(`Cannot start replay buffer: ${startError.message}. Make sure Replay Buffer is enabled in OBS Settings > Output.`);
        }
      } else {
        console.log('✅ Replay buffer is already active');
      }
    } catch (statusError) {
      console.error('❌ Error checking/starting replay buffer:', statusError.message);
      console.error('❌ Full error details:', statusError);
      throw new Error(`Replay buffer configuration issue: ${statusError.message}`);
    }

    console.log('Session established and replay buffer verified, sending SaveReplayBuffer request...');

    const requestId = Date.now().toString();
    const request = {
      op: 6,
      d: {
        requestType: 'SaveReplayBuffer',
        requestId: requestId
      }
    };

    console.log('Sending SaveReplayBuffer request:', JSON.stringify(request, null, 2));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('OBS WebSocket request timeout - no response received');
        reject(new Error('OBS WebSocket request timeout - check if OBS is running and replay buffer is started'));
      }, 15000); // Increased timeout to 15 seconds

      const handleResponse = (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received response:', JSON.stringify(data, null, 2));
          
          if (data.op === 7 && data.d.requestId === requestId) {
            clearTimeout(timeout);
            this.ws.removeListener('message', handleResponse);
            
            if (data.d.requestStatus.code === 100) {
              console.log('✅ Replay buffer saved successfully');
              resolve(data.d.responseData || { 
                success: true, 
                savedAt: new Date().toISOString(),
                sessionId: this.sessionId 
              });
            } else {
              console.log('❌ Replay buffer save failed:', data.d.requestStatus.comment);
              const errorMsg = data.d.requestStatus.comment || 'Unknown error';
              
              // Provide more specific error messages
              if (errorMsg.includes('replay buffer')) {
                reject(new Error(`Replay buffer error: ${errorMsg}. Make sure replay buffer is configured in OBS.`));
              } else if (errorMsg.includes('not running')) {
                reject(new Error(`OBS not running: ${errorMsg}`));
              } else {
                reject(new Error(`Save failed: ${errorMsg}`));
              }
            }
          }
        } catch (error) {
          console.error('Error handling OBS response:', error);
        }
      };

      // Add a small delay before sending to ensure connection is stable
      setTimeout(() => {
        try {
          this.ws.on('message', handleResponse);
          this.send(request);
          console.log('📤 SaveReplayBuffer request sent successfully');
        } catch (sendError) {
          clearTimeout(timeout);
          console.error('❌ Failed to send SaveReplayBuffer request:', sendError);
          reject(new Error(`Failed to send request: ${sendError.message}`));
        }
      }, 100); // 100ms delay to ensure connection stability
    });
  }

  attemptReconnect() {
    if (!this.shouldReconnect) {
      console.log('Reconnection disabled, not attempting to reconnect');
      return;
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect to OBS WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        if (this.shouldReconnect) {
          this.connect().catch(error => {
            console.error('OBS WebSocket reconnection failed:', error);
          });
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max OBS WebSocket reconnection attempts reached');
    }
  }

  getStatus() {
    return {
      connected: this.connected,
      authenticated: this.authenticated,
      url: this.url,
      hasPassword: !!this.password,
      reconnectAttempts: this.reconnectAttempts,
      shouldReconnect: this.shouldReconnect,
      timestamp: new Date().toISOString()
    };
  }

  disconnect() {
    console.log('Disconnecting OBS WebSocket client...');
    this.shouldReconnect = false;
    
    // Clear any pending reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    this.authenticated = false;
    this.reconnectAttempts = 0;
  }
}

module.exports = OBSWebSocketClient;
