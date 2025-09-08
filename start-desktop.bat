@echo off
echo Starting Sport Moment Kiosk Desktop App...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Check if client node_modules exists
if not exist "client\node_modules" (
    echo Installing client dependencies...
    cd client
    npm install
    cd ..
    echo.
)

REM Check if server node_modules exists
if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server
    npm install
    cd ..
    echo.
)

echo Starting desktop application in development mode...
echo Press Ctrl+C to stop the application
echo.

REM Start the desktop app in development mode
npm run electron:dev

pause
