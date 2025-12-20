/**
 * LiveKit Client for Mobile
 * 
 * Note: Requires @livekit/react-native packages to be installed.
 * See LIVEKIT_SETUP.md for installation instructions.
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

export async function fetchLiveKitToken(
  roomName: string,
  userId: string
): Promise<string> {
  // Use the backend API to get LiveKit token
  // The backend should have a similar endpoint to /api/livekit-token
  const res = await fetch(
    `${API_BASE_URL}/livekit-token?roomName=${encodeURIComponent(roomName)}&userId=${encodeURIComponent(userId)}`
  );
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch LiveKit token: ${res.status} ${errorText}`);
  }
  
  const data = await res.json();
  return data.token as string;
}

/**
 * Get LiveKit WebSocket URL from environment
 */
export function getLiveKitWSUrl(): string {
  const wsUrl = process.env.EXPO_PUBLIC_LIVEKIT_WS_URL;
  if (!wsUrl) {
    throw new Error('EXPO_PUBLIC_LIVEKIT_WS_URL is not set');
  }
  return wsUrl;
}
