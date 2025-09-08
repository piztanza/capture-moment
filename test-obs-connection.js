const WebSocket = require('ws');

// Test OBS WebSocket connection
async function testOBSConnection() {
  const url = 'ws://192.168.1.9:4455';
  const password = 'pHZSML4D00NHdL8d';
  
  console.log('Testing OBS WebSocket connection...');
  console.log('URL:', url);
  console.log('Password:', password ? 'Set' : 'Not set');
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    
    ws.on('open', () => {
      console.log('✅ Connected to OBS WebSocket');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Received message:', JSON.stringify(message, null, 2));
        
        if (message.op === 0) { // Hello message
          console.log('👋 Hello message received, sending identify...');
          
          const identifyData = {
            op: 1,
            d: {
              rpcVersion: message.d.rpcVersion,
              authentication: password
            }
          };
          
          console.log('📤 Sending identify:', JSON.stringify(identifyData, null, 2));
          ws.send(JSON.stringify(identifyData));
        }
        
        if (message.op === 2) { // Identified message
          console.log('✅ Successfully identified with OBS');
          
          // Test SaveReplayBuffer request
          const requestId = Date.now().toString();
          const request = {
            op: 6,
            d: {
              requestType: 'SaveReplayBuffer',
              requestId: requestId
            }
          };
          
          console.log('📤 Sending SaveReplayBuffer request:', JSON.stringify(request, null, 2));
          ws.send(JSON.stringify(request));
        }
        
        if (message.op === 7) { // RequestResponse message
          console.log('📨 Request response received:', JSON.stringify(message, null, 2));
          
          if (message.d.requestStatus.code === 100) {
            console.log('✅ Replay buffer saved successfully!');
          } else {
            console.log('❌ Replay buffer save failed:', message.d.requestStatus.comment);
          }
          
          ws.close();
          resolve();
        }
        
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('🔌 Connection closed');
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('⏰ Test timeout');
      ws.close();
      reject(new Error('Test timeout'));
    }, 10000);
  });
}

// Run the test
testOBSConnection()
  .then(() => {
    console.log('🎉 Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  });
