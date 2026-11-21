@echo off
rem Eternal Mana - Server starten (Windows). Beenden: Strg+C, "stop" eingeben oder stop-server.bat
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte Node.js 22.13 oder neuer installieren: https://nodejs.org/
  pause
  exit /b 1
)
node scripts\ensure-build.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
call npm start --silent
pause
