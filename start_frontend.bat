@echo off
TITLE Frontend Server
echo Starting Frontend Server...

:: Navigate to the script's own directory, then into the frontend folder
cd /d "%~dp0"
cd advanced-chat-frontend

:: Start the server
npm run dev

echo.
echo Frontend server has stopped.
pause