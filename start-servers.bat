@echo off
echo Starting Sport Moment Kiosk Servers...
echo.

echo Starting backend server on port 3001...
start "Backend Server" cmd /k "cd server && node server.js"

echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo.
echo Starting frontend server on port 3000...
start "Frontend Server" cmd /k "cd client && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window...
pause > nul
