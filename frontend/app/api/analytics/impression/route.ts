import { NextRequest, NextResponse } from 'next/server';
import { analyticsAPI } from '@v/api-client';

// Helper to check for bots
function isBot(userAgent?: string, webdriver?: boolean): boolean {
  if (webdriver) return true;
  if (!userAgent) return false;

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /headless/i,
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, viewerId, anonId, webdriver } = body;

    // Get request metadata
    const userAgent = request.headers.get('user-agent') || '';

    // Filter bots
    if (isBot(userAgent, webdriver)) {
      return NextResponse.json({ success: true, filtered: 'bot' });
    }

    // Forward to backend
    // We use the analyticsAPI client which handles the fetch to the Go backend
    // Note: The backend expects { postId, userId }
    // For anon users, we might need to handle that in the backend or just send the anonId as userId

    const userId = viewerId || anonId || 'unknown';

    await analyticsAPI.recordImpression({ postId, userId });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error tracking impression:', error);
    return NextResponse.json(
      { error: 'Failed to track impression' },
      { status: 500 }
    );
  }
}

