import { NextRequest, NextResponse } from 'next/server';
import { mockUsers } from '@/lib/mock';
import { currentUserMock } from '@/lib/store';
import { followingRelations } from '../../shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = 20;
    
    // Get users this user is following
    const followingIds = followingRelations.get(id) || new Set<string>();
    
    // Convert to array and paginate
    const followingIdsArray = Array.from(followingIds);
    const startIndex = cursor ? parseInt(cursor) : 0;
    const endIndex = startIndex + limit;
    
    const paginatedFollowingIds = followingIdsArray.slice(startIndex, endIndex);
    
    // Get user data for following
    const following = paginatedFollowingIds.map(followingId => {
      const user = mockUsers.find(u => u.id === followingId) || currentUserMock;
      if (!user) {
        return null;
      }
      return {
        id: user.id,
        name: user.displayName,
        handle: user.handle,
        avatar: user.avatar,
        bio: user.bio || '',
        isFollowing: true, // User is following these people
      };
    }).filter(Boolean);
    
    return NextResponse.json({
      following,
      nextCursor: endIndex < followingIdsArray.length ? endIndex.toString() : null,
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    return NextResponse.json(
      { error: 'Failed to fetch following' },
      { status: 500 }
    );
  }
}

