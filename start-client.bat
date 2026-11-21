@echo off
rem Eternal Mana - Spiel im Browser oeffnen.
rem   start-client.bat                   = Server auf diesem Rechner
rem   start-client.bat 100.101.102.103   = Server eines Freundes (Tailscale-IP oder MagicDNS-Name)
chcp 65001 >nul
cd /d "%~dp0"
set "ADDR=%~1"
if "%ADDR%"=="" set /p ADDR=Serveradresse (leer lassen fuer diesen Rechner): 
where node >nul 2>nul
if errorlevel 1 (
  if "%ADDR%"=="" set "ADDR=localhost"
  start "" "http://%ADDR%:7777"
) else (
  node scripts\open.mjs "%ADDR%"
)
