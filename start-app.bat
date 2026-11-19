@echo off
cd /d "%~dp0"
echo Starting YouTube clone (API + Vite)...
npm run dev
if errorlevel 1 pause
