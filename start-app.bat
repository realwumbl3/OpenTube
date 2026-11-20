@echo off
cd /d "%~dp0"
echo Starting YouTube clone (API + Vite)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-node.ps1"
if errorlevel 1 pause & exit /b 1
call npm run dev:app
if errorlevel 1 pause
