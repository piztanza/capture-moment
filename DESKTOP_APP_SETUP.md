# Sport Moment Kiosk - Desktop App Setup

This guide will help you convert your web-based Sport Moment Kiosk into a desktop application using Electron.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- OBS Studio (for video recording functionality)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   cd server && npm install && cd ..
   ```

2. **Start Development Mode**
   ```bash
   # Windows
   start-desktop.bat
   
   # Or manually
   npm run electron:dev
   ```

3. **Build for Production**
   ```bash
   npm run electron:dist
   ```

## 📁 Project Structure

```
sport-moment-kiosk/
├── electron/
│   ├── main.js          # Main Electron process
│   └── preload.js       # Preload script for security
├── client/              # React frontend
├── server/              # Node.js backend
├── assets/              # App icons and resources
├── dist-electron/       # Built desktop app (after build)
└── package.json         # Main package configuration
```

## 🛠️ Development

### Available Scripts

- `npm run electron:dev` - Start in development mode
- `npm run electron:pack` - Build and package the app
- `npm run electron:dist` - Create distribution packages
- `npm run build` - Build the React frontend
- `npm run dev` - Start web development mode

### Development Mode
In development mode, the app will:
- Load the React app from `http://localhost:3000`
- Start the Node.js server automatically
- Open DevTools for debugging
- Hot reload when you make changes

## 📦 Building & Distribution

### Create Installer
```bash
npm run electron:dist
```

This will create installers in the `dist-electron/` folder:
- **Windows**: `.exe` installer
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage` file

### Customizing the Build

Edit the `build` section in `package.json`:

```json
{
  "build": {
    "appId": "com.sportmoment.kiosk",
    "productName": "Sport Moment Kiosk",
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    }
  }
}
```

## 🎯 Features

### Desktop App Benefits
- ✅ **Local File Access**: Direct access to local video storage
- ✅ **OBS Integration**: Seamless integration with OBS Studio
- ✅ **Offline Operation**: Works without internet connection
- ✅ **Kiosk Mode**: Fullscreen operation for public use
- ✅ **Easy Installation**: Simple installer for end users
- ✅ **Cross-Platform**: Works on Windows, macOS, and Linux

### Security Features
- ✅ **Context Isolation**: Secure communication between processes
- ✅ **No Node Integration**: Renderer process is sandboxed
- ✅ **Preload Scripts**: Controlled API exposure
- ✅ **External Link Protection**: Prevents unwanted navigation

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Video Storage Paths
REPLAY_DIRECTORY=C:/Replays
VIDEOS_DIRECTORY=C:/Users/YourUsername/Videos

# OBS WebSocket
OBS_WEBSOCKET_PORT=4455
OBS_WEBSOCKET_PASSWORD=your_password
```

### App Icons
Replace the placeholder icons in the `assets/` folder:
- `icon.ico` - Windows icon (256x256)
- `icon.icns` - macOS icon (512x512)
- `icon.png` - Linux icon (512x512)

## 🚀 Deployment

### For End Users
1. Build the application: `npm run electron:dist`
2. Distribute the installer from `dist-electron/` folder
3. Users can install and run the app like any other desktop application

### For Developers
1. Clone the repository
2. Run `npm install` to install dependencies
3. Use `npm run electron:dev` for development
4. Use `npm run electron:dist` to create installers

## 🐛 Troubleshooting

### Common Issues

**App won't start:**
- Check if all dependencies are installed
- Verify Node.js version (v16+)
- Check console for error messages

**OBS connection fails:**
- Ensure OBS Studio is running
- Verify WebSocket plugin is enabled
- Check firewall settings

**Video files not found:**
- Verify video directory paths in environment variables
- Check file permissions
- Ensure OBS is saving to the correct directory

### Debug Mode
Run with debug logging:
```bash
DEBUG=* npm run electron:dev
```

## 📝 Notes

- The desktop app maintains all the functionality of the web version
- Videos are stored locally on the user's computer
- OBS Studio integration works the same as the web version
- The app runs in fullscreen kiosk mode by default
- Users can exit fullscreen with F11 or Alt+F4

## 🔄 Updates

To update the app:
1. Make your changes to the code
2. Run `npm run electron:dist` to create new installers
3. Distribute the new installer to users
4. Users can install over the existing installation

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Ensure all prerequisites are installed correctly
