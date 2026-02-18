@echo off
echo Starting Assurfi...

:: Start Backend
start "Assurfi Backend" cmd /k "cd /d %~dp0\api && node server.js"

:: Start Frontend
start "Assurfi Frontend" cmd /k "cd /d %~dp0\frontend && node node_modules/vite/bin/vite.js"

echo servers launching in new windows...
