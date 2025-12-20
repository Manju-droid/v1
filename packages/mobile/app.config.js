// Expo app configuration with environment variable support
// This file allows reading from .env files

export default {
  expo: {
    name: "V Platform",
    slug: "v-platform",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0C1117"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.vplatform.app",
      infoPlist: {
        NSMicrophoneUsageDescription: "This app needs access to your microphone for audio debates."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0C1117"
      },
      package: "com.vplatform.app",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    scheme: "v-platform",
    plugins: [
      "expo-router",
      "@livekit/react-native-expo-plugin",
      [
        "@config-plugins/react-native-webrtc",
        {
          android: {
            audioType: "communication"
          }
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "placeholder"
      },
      // Environment variables will be available via process.env.EXPO_PUBLIC_*
      // Set these in your .env file or when running expo
      livekitWsUrl: process.env.EXPO_PUBLIC_LIVEKIT_WS_URL || "wss://app1-f19k5vmv.livekit.cloud",
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api"
    }
  }
};
