#!/bin/bash

echo "🚀 Setting up AI Notes PWA..."
echo ""

# Check dependencies
echo "🔍 Checking dependencies..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

echo "✅ Dependencies found"
echo ""

# Backend setup
echo "🐍 Setting up backend..."
./install-backend.sh

if [ $? -ne 0 ]; then
    echo "❌ Backend setup failed. Please check the errors above."
    exit 1
fi

echo ""

# Frontend setup
echo "⚛️  Setting up frontend..."
cd frontend

echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Frontend setup failed. Please check the errors above."
    exit 1
fi

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 To start the application:"
echo "1. Backend:  ./start-backend.sh"
echo "2. Frontend: ./start-frontend.sh"
echo ""
echo "🔑 IMPORTANT:"
echo "• Add your GEMINI_API_KEY to backend/.env"
echo "• Frontend: http://localhost:5173"
echo "• Backend API: http://localhost:8000"