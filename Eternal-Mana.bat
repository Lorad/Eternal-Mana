@echo off
rem Eternal Mana - Launcher: sucht Aktualisierungen, zeigt Neuigkeiten, startet Spiel und Server.
rem Dieses Fenster schliesst sich sofort wieder. Ganz ohne Konsolenfenster startet die Verknuepfung "Eternal Mana",
rem die der Launcher beim ersten Start in diesem Ordner anlegt.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte Node.js 22.13 oder neuer installieren: https://nodejs.org/
  pause
  exit /b 1
)
start "" wscript.exe //nologo //e:jscript "%~dp0launcher\start-hidden.js"
if errorlevel 1 powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath node -ArgumentList 'launcher/launcher.mjs' -WindowStyle Hidden" >nul 2>nul
