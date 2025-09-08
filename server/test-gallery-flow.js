const { dbHelpers } = require('./database');

async function testGalleryFlow() {
  console.log('🧪 Testing Gallery Flow');
  console.log('='.repeat(50));
  
  try {
    // Get all active sessions
    const activeSessions = await new Promise((resolve, reject) => {
      const db = require('sqlite3').verbose().Database;
      const dbPath = require('path').join(__dirname, 'sport_moment.db');
      const database = new db(dbPath);
      
      database.all("SELECT * FROM sessions WHERE status = 'active'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
        database.close();
      });
    });
    
    console.log(`📊 Found ${activeSessions.length} active sessions:`);
    
    for (const session of activeSessions) {
      console.log(`\n🔍 Testing session: ${session.session_name} (${session.session_id})`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Duration: ${session.duration_minutes} minutes`);
      console.log(`   Start time: ${session.start_time}`);
      
      // Test session lookup
      const foundSession = await dbHelpers.getSessionBySessionId(session.session_id);
      if (foundSession) {
        console.log(`   ✅ Session lookup successful`);
        console.log(`   ✅ Session status: ${foundSession.status}`);
        
        if (foundSession.status === 'active') {
          console.log(`   ✅ Session is active - GalleryPage should work`);
        } else {
          console.log(`   ❌ Session is not active - GalleryPage should redirect`);
        }
      } else {
        console.log(`   ❌ Session lookup failed`);
      }
      
      // Test session folder
      const fs = require('fs');
      const path = require('path');
      const sessionFolderName = `${session.session_name}_${session.session_id}`;
      const sessionFolderPath = path.join('C:/Replays', sessionFolderName);
      
      if (fs.existsSync(sessionFolderPath)) {
        console.log(`   ✅ Session folder exists: ${sessionFolderPath}`);
        
        // Check for videos
        const files = fs.readdirSync(sessionFolderPath);
        const videoFiles = files.filter(file => {
          const ext = require('path').extname(file).toLowerCase();
          return ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.wmv', '.flv', '.m4v'].includes(ext);
        });
        
        console.log(`   📹 Found ${videoFiles.length} video files`);
        if (videoFiles.length > 0) {
          videoFiles.forEach(file => console.log(`      - ${file}`));
        }
      } else {
        console.log(`   ❌ Session folder does not exist: ${sessionFolderPath}`);
      }
    }
    
    if (activeSessions.length === 0) {
      console.log('❌ No active sessions found');
      console.log('💡 Create a new session to test the GalleryPage');
    }
    
  } catch (error) {
    console.error('❌ Error testing gallery flow:', error.message);
  }
}

// Run the test
testGalleryFlow();
