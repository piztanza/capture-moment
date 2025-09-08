@echo off
echo Starting Sport Moment Kiosk Development Environment...
echo.

echo Installing root dependencies...
call npm install

echo.
echo Installing server dependencies...
cd server
call npm install
cd ..

echo.
echo Installing client dependencies...
cd client
call npm install
cd ..

echo.
echo Starting development servers...
echo Frontend will be available at: http://localhost:3000
echo Backend will be available at: http://localhost:3001
echo.

call npm run dev
