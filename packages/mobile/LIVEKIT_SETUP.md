# LiveKit Audio Setup for Mobile

## Installation

To enable audio streaming in the mobile app, install LiveKit React Native SDK:

```bash
cd packages/mobile
npx expo install @livekit/react-native @livekit/react-native-expo-plugin @livekit/react-native-webrtc @config-plugins/react-native-webrtc livekit-client
```

## Configuration

### 1. Update `app.json`

Add LiveKit plugins to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      "@livekit/react-native-expo-plugin",
      [
        "@config-plugins/react-native-webrtc",
        {
          "android": {
            "audioType": "communication"
          }
        }
      ]
    ]
  }
}
```

### 2. Environment Variables

Add to your `.env` or `app.config.js`:

```javascript
{
  "expo": {
    "extra": {
      "LIVEKIT_WS_URL": "wss://your-livekit-server.com",
      "LIVEKIT_API_URL": "https://your-livekit-server.com"
    }
  }
}
```

### 3. Initialize LiveKit

In your `app/_layout.tsx` or root component:

```typescript
import { registerGlobals } from '@livekit/react-native';

// Register LiveKit globals
registerGlobals();
```

## Important Notes

⚠️ **Expo Go Limitation**: LiveKit requires native code, so you **cannot** test with Expo Go. You must:

1. Create a development build:
   ```bash
   npx expo prebuild
   npx expo run:ios
   # or
   npx expo run:android
   ```

2. Or use EAS Build:
   ```bash
   eas build --profile development --platform ios
   ```

## Permissions

The app will automatically request microphone permissions when needed. Ensure these are in your `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "This app needs access to your microphone for audio debates."
      }
    },
    "android": {
      "permissions": [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ]
    }
  }
}
```

## Usage

See `app/debates/[id]/room.tsx` for the full implementation.
