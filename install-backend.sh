#!/bin/bash

echo "🔧 Installing backend dependencies..."

cd backend

# Check Python version
python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "📋 Detected Python version: $python_version"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "🐍 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "⚡ Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# For Python 3.13, install with no binary for problematic packages
if [[ "$python_version" == "3.13" ]]; then
    echo "🛠️  Installing dependencies for Python 3.13..."
    pip install --upgrade pip setuptools wheel
    pip install fastapi uvicorn[standard] sqlalchemy python-dotenv google-generativeai python-multipart apscheduler pywebpush
else
    echo "📦 Installing from requirements.txt..."
    pip install -r requirements.txt
fi

# Create .env file
if [ ! -f ".env" ]; then
    echo "📄 Creating .env file..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env and add your GEMINI_API_KEY"
    echo ""
fi

echo "✅ Backend installation complete!"
echo ""
echo "Next steps:"
echo "1. Add your GEMINI_API_KEY to backend/.env"
echo "2. Run: cd backend && source venv/bin/activate && python main.py"