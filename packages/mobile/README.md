# @v/mobile - V Platform Mobile App

React Native mobile application for iOS and Android using Expo.

## Features

- ✅ Uses shared code from `@v/shared` and `@v/api-client`
- ✅ Expo Router for navigation
- ✅ TypeScript support
- ✅ Dark theme matching web app

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (for Mac) or Android Emulator

### Installation

```bash
# From project root
npm install

# Or from mobile directory
cd packages/mobile
npm install
```

### Running the App

```bash
# From project root
npm run dev:mobile

# Or from mobile directory
cd packages/mobile
npm run dev
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web browser
- Scan QR code with Expo Go app on your phone

## Project Structure

```
packages/mobile/
├── app/              # Expo Router pages
│   ├── _layout.tsx   # Root layout
│   ├── index.tsx      # Home screen
│   └── notifications.tsx  # Notifications screen
├── assets/           # Images, fonts, etc.
└── package.json
```

## Shared Code

This app uses:
- `@v/shared` - Domain models, services, utilities
- `@v/api-client` - API client for backend

Example:
```typescript
import { Notification, NotificationService, formatRelativeTime } from '@v/shared';
import { notificationAPI } from '@v/api-client';
```

## Building

```bash
# Build for production
npm run build

# iOS
npm run ios

# Android
npm run android
```
