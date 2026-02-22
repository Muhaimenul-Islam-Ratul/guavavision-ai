@echo off
echo ============================================
echo   GuavaVision AI - Frontend Start
echo ============================================
echo.

cd /d "%~dp0Frontend\guava-app"

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install

echo.
echo ============================================
echo   Starting Frontend on http://localhost:5173
echo ============================================
call npm run dev
pause
