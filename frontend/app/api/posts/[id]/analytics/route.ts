import { NextRequest, NextResponse } from 'next/server';
import { analyticsAPI } from '@v/api-client';

/**
 * Get analytics data for a post
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch analytics from backend
    const analytics = await analyticsAPI.getPostAnalytics(id);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

