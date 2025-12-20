import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomName = searchParams.get("roomName") || "default-room";
  const userId = searchParams.get("userId") || "anonymous";

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "LiveKit env not configured" },
      { status: 500 }
    );
  }

  try {
    const at = new AccessToken(
      apiKey,
      apiSecret,
      {
        identity: userId,
      }
    );

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (error) {
    console.error("[LiveKit Token] Error generating token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}

