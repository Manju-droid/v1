#!/bin/bash

# Script to restart both frontend and backend servers
# Run this from the project root (v1/) directory

echo "🛑 Stopping any running servers..."

# Kill processes on ports 3000 and 8080
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

echo "⏳ Waiting 2 seconds..."
sleep 2

echo "🚀 Starting Backend Server..."
cd backend
go run cmd/api/main.go &
BACKEND_PID=$!
cd ..

echo "⏳ Waiting for backend to start..."
sleep 3

# Check if backend is running
if curl -s http://localhost:8080/api/health > /dev/null; then
    echo "✅ Backend is running on http://localhost:8080"
else
    echo "⚠️  Backend might not be ready yet. Check manually: curl http://localhost:8080/api/health"
fi

echo "🚀 Starting Frontend Server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers starting..."
echo "📡 Backend: http://localhost:8080"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait

