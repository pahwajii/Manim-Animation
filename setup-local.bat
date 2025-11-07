@echo off
REM Local setup script for Windows

echo 🚀 Setting up Manim AI Pipeline...

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found. Please install Node.js 18+
    exit /b 1
)

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python not found. Please install Python 3.10+
    exit /b 1
)

REM Check FFmpeg
where ffmpeg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  FFmpeg not found. Please install FFmpeg manually
    echo    Download from: https://ffmpeg.org/download.html
)

echo ✓ Prerequisites check passed

REM Install Node dependencies
echo 📦 Installing Node dependencies...
call npm install

REM Create Python virtual environment
if not exist "manimenv" (
    echo 🐍 Creating Python virtual environment...
    python -m venv manimenv
)

REM Activate and install Python dependencies
echo 📦 Installing Python dependencies...
call manimenv\Scripts\activate
pip install -r backend/requirements.txt

REM Create .env if it doesn't exist
if not exist "backend\.env" (
    echo 📝 Creating .env file...
    copy backend\.env.example backend\.env
    echo.
    echo ⚠️  IMPORTANT: Edit backend\.env and add your GEMINI_API_KEY
    echo.
)

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Edit backend\.env and add your GEMINI_API_KEY
echo 2. Set Python/Manim paths in backend\.env if needed
echo 3. Run: npm run dev
echo 4. Open: http://localhost:5173
echo.
pause
