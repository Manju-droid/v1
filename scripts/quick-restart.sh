#!/bin/bash
echo "🛑 Stopping servers..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 2
echo "✅ Servers stopped"
echo ""
echo "📝 To start servers, run these commands in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend && go run cmd/api/main.go"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend && npm run dev"
