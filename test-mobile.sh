#!/bin/bash

echo "🚀 Mobile App Testing Setup"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -d "packages/mobile" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "1️⃣ Installing dependencies..."
npm install

echo ""
echo "2️⃣ Building shared packages..."
npm run build:shared
npm run build:api-client

echo ""
echo "3️⃣ Checking mobile dependencies..."
cd packages/mobile
if [ ! -d "node_modules/@react-native-async-storage" ]; then
    echo "   Installing AsyncStorage..."
    npm install @react-native-async-storage/async-storage
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 Next steps:"
echo "   1. Start the backend server:"
echo "      cd backend && go run cmd/api/main.go"
echo ""
echo "   2. Start the mobile app (in a new terminal):"
echo "      cd packages/mobile && npm run dev"
echo ""
echo "   3. Scan the QR code with Expo Go app or press 'i' for iOS simulator"
echo ""
