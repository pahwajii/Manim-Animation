#!/bin/bash
# Local setup script for Linux/Mac

echo "🚀 Setting up Manim AI Pipeline..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.10+"
    exit 1
fi

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ffmpeg
    else
        sudo apt-get update && sudo apt-get install -y ffmpeg
    fi
fi

echo "✓ Prerequisites check passed"

# Install Node dependencies
echo "📦 Installing Node dependencies..."
npm install

# Create Python virtual environment
if [ ! -d "manimenv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv manimenv
fi

# Activate and install Python dependencies
echo "📦 Installing Python dependencies..."
source manimenv/bin/activate
pip install -r backend/requirements.txt

# Create .env if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating .env file..."
    cp backend/.env.example backend/.env
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env and add your GEMINI_API_KEY"
    echo ""
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env and add your GEMINI_API_KEY"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:5173"
echo ""
