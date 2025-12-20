import { Room } from "livekit-client";

export async function fetchLiveKitToken(
  roomName: string,
  userId: string
): Promise<string> {
  const res = await fetch(`/api/livekit-token?roomName=${encodeURIComponent(roomName)}&userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch LiveKit token: ${res.status} ${errorText}`);
  }
  const data = await res.json();
  return data.token as string;
}

export async function connectToLiveKitRoom(
  roomName: string,
  userId: string
): Promise<Room> {
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL;
  if (!wsUrl) {
    throw new Error('NEXT_PUBLIC_LIVEKIT_WS_URL is not set');
  }
  const token = await fetchLiveKitToken(roomName, userId);
  const room = new Room();
  await room.connect(wsUrl, token);
  return room;
}

