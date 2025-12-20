import { NextRequest, NextResponse } from 'next/server';

// TypeScript type for debate topic stats
export type DebateTopicStats = {
  topic: string;
  totalParticipants: number;
  totalAgree: number;
  totalDisagree: number;
  sessionsCount: number;
  lastUpdated: string;
};

// In-memory store for debate stats
const statsByTopic: Record<string, DebateTopicStats> = {};

// Helper function to normalize topic (used as key)
function normalizeTopic(raw: string): string {
  return raw.trim().toLowerCase();
}

// POST /api/debate-stats - Record stats for a debate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, agreeCount, disagreeCount, participants } = body;

    // Validate required fields
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Topic is required and must be a string' },
        { status: 400 }
      );
    }

    if (typeof agreeCount !== 'number' || agreeCount < 0) {
      return NextResponse.json(
        { success: false, error: 'agreeCount must be a non-negative number' },
        { status: 400 }
      );
    }

    if (typeof disagreeCount !== 'number' || disagreeCount < 0) {
      return NextResponse.json(
        { success: false, error: 'disagreeCount must be a non-negative number' },
        { status: 400 }
      );
    }

    if (typeof participants !== 'number' || participants < 0) {
      return NextResponse.json(
        { success: false, error: 'participants must be a non-negative number' },
        { status: 400 }
      );
    }

    // Normalize topic as key
    const key = normalizeTopic(topic);

    // Get existing stats or create new
    const existing = statsByTopic[key];

    if (!existing) {
      // Create new stats entry
      statsByTopic[key] = {
        topic: topic.trim(), // Store original topic for display
        totalParticipants: participants,
        totalAgree: agreeCount,
        totalDisagree: disagreeCount,
        sessionsCount: 1,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      // Update existing stats
      existing.totalParticipants += participants;
      existing.totalAgree += agreeCount;
      existing.totalDisagree += disagreeCount;
      existing.sessionsCount += 1;
      existing.lastUpdated = new Date().toISOString();
    }

    return NextResponse.json({
      success: true,
      data: statsByTopic[key],
    });
  } catch (error: any) {
    console.error('[Debate Stats API] Error in POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/debate-stats - Get all stats
export async function GET() {
  try {
    // Return all stats as an array
    const stats = Object.values(statsByTopic);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[Debate Stats API] Error in GET:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

