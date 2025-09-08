# Sport Moment Kiosk - Setup Complete! 🎉

Your web-based kiosk application for sports facilities has been successfully created! Here's what has been built:

## ✅ What's Included

### Backend (Express Server)
- **SQLite Database** with sessions table
- **API Endpoints** for payment, sessions, and video management
- **Mock Payment System** with QR code generation
- **Video Streaming** from configurable replay directory
- **CORS Support** for frontend communication

### Frontend (React PWA)
- **Progressive Web App** with fullscreen kiosk mode
- **Modern UI** with gradient backgrounds and smooth animations
- **React Router** for navigation between pages
- **Service Worker** for offline functionality
- **Responsive Design** for different screen sizes

### Pages & Features
1. **Home Page** - Session duration selection (30/60/120 minutes)
2. **Payment Page** - QR code payment with status polling
3. **Session Name Page** - Custom session naming
4. **Active Session Page** - Countdown timer and replay trigger
5. **Gallery Page** - Video viewing and QR code downloads

## 🚀 How to Run

### Development Mode
```bash
# Install all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Start both servers
npm run dev
```

### Production Mode
```bash
# Build the client
cd client && npm run build && cd ..

# Start the server
cd server && npm start
```

## 📱 PWA Features

- **Installable** on kiosk machines
- **Fullscreen** experience
- **Offline** app shell caching
- **Auto-update** when new versions are available
- **Manifest** configured for kiosk use

## 🎯 Key Features

### Payment Flow
- Mock Midtrans integration
- QR code generation for payments
- Automatic payment status checking
- Session creation on successful payment

### Session Management
- Real-time countdown timer
- Session naming
- Status tracking (pending → paid → active → finished)

### Video Gallery
- Automatic video discovery from replay directory
- Video streaming with range request support
- QR code generation for phone downloads
- Thumbnail grid layout

### OBS Integration
- "Take Replay" button triggers console log
- Ready for WebSocket or API integration
- Configurable for different OBS setups

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 3001)
- `REPLAY_DIRECTORY` - Video storage path (default: C:/Replays)

### Database
- SQLite database: `server/sport_moment.db`
- Automatic table creation on first run
- Session data persistence

## 📁 Project Structure
```
sport-moment-kiosk/
├── client/                 # React PWA frontend
│   ├── src/pages/         # Page components
│   ├── public/            # Static assets & PWA icons
│   └── vite.config.js     # Vite + PWA configuration
├── server/                # Express backend
│   ├── server.js          # Main server file
│   ├── database.js        # SQLite setup
│   └── sport_moment.db    # Database file (created on first run)
├── package.json           # Root package with dev scripts
└── README.md              # Detailed documentation
```

## 🎨 UI/UX Features

- **Modern Design** with gradient backgrounds
- **Large Touch-Friendly Buttons** for kiosk use
- **Smooth Animations** and hover effects
- **Responsive Layout** for different screen sizes
- **Loading States** and error handling
- **Modal Dialogs** for QR code display

## 🔌 API Endpoints

- `POST /api/create-payment` - Create payment session
- `GET /api/payment-status/:order_id` - Check payment status
- `PUT /api/start-session/:id` - Start session with name
- `GET /api/gallery-videos` - List available videos
- `GET /api/video/:filename` - Stream/download video
- `GET /api/health` - Health check

## 🚀 Next Steps

1. **Test the Application**:
   ```bash
   npm run dev
   ```
   Visit: http://localhost:3000

2. **Configure OBS Integration**:
   - Set up OBS WebSocket plugin
   - Update server to send WebSocket messages
   - Or use system keypress simulation

3. **Customize Styling**:
   - Modify `client/src/App.css`
   - Update colors, fonts, and layout
   - Add your facility's branding

4. **Deploy to Production**:
   - Build the client: `npm run build`
   - Set up production server
   - Configure HTTPS for PWA installation

5. **Add Real Payment Integration**:
   - Replace mock payment with real Midtrans API
   - Add proper error handling
   - Implement webhook handling

## 🎯 Ready for Kiosk Use!

The application is now ready to be deployed on a kiosk machine. The PWA can be installed for a native app-like experience, and the fullscreen mode provides an optimal kiosk interface.

**Happy coding! 🏆**
