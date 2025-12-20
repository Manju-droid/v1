import { NextRequest, NextResponse } from 'next/server';
import { mockUsers } from '@/lib/mock';
import { currentUserMock } from '@/lib/store';
import { followRelations } from '../../shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = 20;
    
    // Get followers for this user
    const followerIds = followRelations.get(id) || new Set<string>();
    
    // Convert to array and paginate
    const followerIdsArray = Array.from(followerIds);
    const startIndex = cursor ? parseInt(cursor) : 0;
    const endIndex = startIndex + limit;
    
    const paginatedFollowerIds = followerIdsArray.slice(startIndex, endIndex);
    
    // Get user data for followers
    const followers = paginatedFollowerIds.map(followerId => {
      const user = mockUsers.find(u => u.id === followerId) || currentUserMock;
      if (!user) {
        return null;
      }
      return {
        id: user.id,
        name: user.displayName,
        handle: user.handle,
        avatar: user.avatar,
        bio: user.bio || '',
        isFollowing: false, // In real app, check if current user follows this follower
      };
    }).filter(Boolean);
    
    return NextResponse.json({
      followers,
      nextCursor: endIndex < followerIdsArray.length ? endIndex.toString() : null,
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch followers' },
      { status: 500 }
    );
  }
}

