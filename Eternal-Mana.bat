@echo off
rem Eternal Mana - Launcher: sucht Aktualisierungen, zeigt Neuigkeiten, startet Spiel und Server.
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte Node.js 22.13 oder neuer installieren: https://nodejs.org/
  pause
  exit /b 1
)
rem Der Launcher laeuft unsichtbar im Hintergrund und oeffnet sein eigenes Fenster.
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath node -ArgumentList 'launcher/launcher.mjs' -WindowStyle Hidden" >nul 2>nul
if errorlevel 1 node launcher\launcher.mjs
