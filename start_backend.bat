@echo off
TITLE Backend Server
echo Starting Backend Server...

:: Navigate to the script's own directory, then into the backend folder
cd /d "%~dp0"
cd advanced-chat-backend

:: Start the server
npm run start:dev

echo.
echo Backend server has stopped.
pause