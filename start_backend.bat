@echo off
echo ============================================
echo   GuavaVision AI - Backend Setup & Start
echo ============================================
echo.

cd /d "%~dp0backend"

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

echo [1/3] Python found. Checking virtual environment...
if not exist "venv" (
    echo [2/3] Creating virtual environment...
    python -m venv venv
)

echo [3/3] Activating virtual environment and installing dependencies...
call venv\Scripts\activate.bat

python -m pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Dependency installation failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Starting Backend API on http://localhost:8000
echo ============================================
venv\Scripts\python.exe backend_api.py
pause
