@echo off
echo Starting Assurfi...

:: Start Backend
start "Assurfi Backend" cmd /k "cd /d %~dp0 && npm run api:dev"

:: Start Frontend
start "Assurfi Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo servers launching in new windows...
