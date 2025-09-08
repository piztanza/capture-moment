# Sport Moment Kiosk

A web-based kiosk application for sports facilities that allows users to pay for sessions, trigger replay captures via OBS, and view/download their captured moments.

## Features

- **Progressive Web App (PWA)** - Installable on kiosk machines with fullscreen experience
- **Payment Integration** - Mock Midtrans payment system with QR codes
- **Session Management** - Track active sessions with countdown timers
- **Replay Capture** - Trigger OBS recordings during sessions
- **Video Gallery** - View and download captured videos
- **QR Code Downloads** - Generate QR codes for easy phone downloads

## Technology Stack

- **Frontend**: React.js with Vite
- **Backend**: Node.js with Express
- **Database**: SQLite
- **PWA**: vite-plugin-pwa with service worker

## Project Structure

```
sport-moment-kiosk/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # React page components
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # App entry point
│   ├── public/            # Static assets
│   └── vite.config.js     # Vite configuration with PWA
├── server/                # Express backend
│   ├── server.js          # Main server file
│   ├── database.js        # SQLite database setup
│   └── package.json       # Server dependencies
└── package.json           # Root package.json with scripts
```

## Setup Instructions

### Prerequisites

- Node.js (v20.14.0 or higher)
- npm

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd sport-moment-kiosk
   npm install
   ```

2. **Install server dependencies:**
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Install client dependencies:**
   ```bash
   cd client
   npm install
   cd ..
   ```

### Configuration

1. **Replay Directory**: The server is configured to read videos from `C:/Replays` by default. You can change this by setting the `REPLAY_DIRECTORY` environment variable:
   ```bash
   set REPLAY_DIRECTORY=D:/MyReplays
   ```

2. **Server Port**: The server runs on port 3001 by default. Change with:
   ```bash
   set PORT=3001
   ```

## Running the Application

### Development Mode

Run both client and server concurrently:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Production Mode

1. **Build the client:**
   ```bash
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

## Usage Flow

1. **Home Page**: Select session duration (30, 60, or 120 minutes)
2. **Payment**: Scan QR code to complete payment (mock system)
3. **Session Name**: Enter a name for your session
4. **Active Session**: 
   - View countdown timer
   - Click "Take Replay" to trigger OBS capture
   - Access gallery to view/download videos
5. **Gallery**: View captured videos and generate QR codes for phone downloads

## API Endpoints

### Payment
- `POST /api/create-payment` - Create payment session
- `GET /api/payment-status/:order_id` - Check payment status

### Sessions
- `PUT /api/start-session/:id` - Start a session
- `GET /api/health` - Health check

### Videos
- `GET /api/gallery-videos` - List all videos
- `GET /api/video/:filename` - Stream/download video file

## PWA Features

- **Installable**: Can be installed on kiosk machines
- **Fullscreen**: Runs in fullscreen mode for kiosk experience
- **Offline**: Caches app shell for offline access
- **Auto-update**: Automatically updates when new versions are available

## OBS Integration

The "Take Replay" button currently logs "F9 keypress triggered" to the console. To integrate with OBS:

1. **WebSocket Method** (Recommended):
   - Install OBS WebSocket plugin
   - Configure server to send WebSocket messages to OBS
   - Trigger replay buffer start/stop

2. **System Keypress Method**:
   - Use a library like `robotjs` to simulate F9 keypress
   - Configure OBS to start replay buffer on F9

3. **API Method**:
   - Use OBS Studio's built-in HTTP API
   - Send HTTP requests to trigger replay capture

## Database Schema

### Sessions Table
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_name TEXT,
  duration_minutes INTEGER NOT NULL,
  start_time DATETIME,
  status TEXT DEFAULT 'pending',
  midtrans_order_id TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Customization

### Styling
- Modify `client/src/App.css` for custom styling
- Update colors, fonts, and layout as needed

### Payment Integration
- Replace mock payment system in `server/server.js`
- Integrate with real Midtrans API
- Add proper error handling and validation

### Video Processing
- Add video thumbnail generation
- Implement video compression
- Add video metadata extraction

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in `vite.config.js` and `server.js`
2. **Database errors**: Delete `server/sport_moment.db` to reset
3. **PWA not installing**: Check manifest.json and service worker
4. **Videos not loading**: Verify replay directory exists and has proper permissions

### Logs
- Server logs: Check console output
- Client logs: Open browser developer tools
- Database: SQLite database file in `server/` directory

## Security Considerations

- Add authentication for admin functions
- Implement rate limiting for API endpoints
- Add input validation and sanitization
- Use HTTPS in production
- Secure file upload/download endpoints

## License

MIT License - see LICENSE file for details.
