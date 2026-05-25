#!/bin/bash

echo "🚀 Starting Attune with Sync..."
echo ""

# Check if backend is compiled
if [ ! -d "backend/dist" ]; then
  echo "📦 Compiling backend..."
  cd backend
  ./node_modules/.bin/tsc
  cd ..
fi

# Start backend in background
echo "🔧 Starting backend on port 3000..."
cd backend
node dist/server.js &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Check if backend is running
if curl -s http://localhost:3000/health > /dev/null; then
  echo "✅ Backend running"
else
  echo "❌ Backend failed to start"
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

echo ""
echo "🎨 Starting frontend..."
echo "📱 Open http://localhost:5173 in your browser"
echo "👤 Go to Profiles tab to see Cloud Sync"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start frontend (this will block)
npm run dev

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null
