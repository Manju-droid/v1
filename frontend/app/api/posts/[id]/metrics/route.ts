import { NextRequest, NextResponse } from 'next/server';
import { analyticsAPI } from '@v/api-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch metrics from backend
    const metrics = await analyticsAPI.getPostMetrics(id);

    // Set ETag for caching
    const etag = `"${id}-${Date.now()}"`;

    return NextResponse.json(metrics, {
      headers: {
        'ETag': etag,
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

