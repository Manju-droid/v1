import { NextRequest, NextResponse } from 'next/server';
import { mockUsers } from '@/lib/mock';
import { currentUserMock } from '@/lib/store';
import { followRelations, followingRelations } from '../shared';

// In-memory storage for user stats (in real app, use database)
const userStats = new Map<string, {
  posts: number;
  followers: number;
  following: number;
  reachTotal: number;
}>();

// Initialize stats for mock users
mockUsers.forEach(user => {
  if (!userStats.has(user.id)) {
    userStats.set(user.id, {
      posts: Math.floor(Math.random() * 500) + 50,
      followers: Math.floor(Math.random() * 20000) + 1000,
      following: Math.floor(Math.random() * 500) + 50,
      reachTotal: Math.floor(Math.random() * 100000) + 10000,
    });
  }
});

// Initialize current user stats
if (currentUserMock && !userStats.has(currentUserMock.id)) {
  userStats.set(currentUserMock.id, {
    posts: 350,
    followers: 12500,
    following: 298,
    reachTotal: 75000,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const viewerId = currentUserMock?.id || ''; // In real app, get from auth session
    
    // Find user by handle
    const user = mockUsers.find(u => u.handle.toLowerCase() === handle.toLowerCase()) ||
                 (currentUserMock && handle.toLowerCase() === currentUserMock.handle.toLowerCase() ? currentUserMock : null);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const stats = userStats.get(user.id) || {
      posts: 0,
      followers: 0,
      following: 0,
      reachTotal: 0,
    };
    
    // Check if viewer is following this user
    const isFollowing = viewerId && viewerId !== user.id && followRelations.has(user.id) && followRelations.get(user.id)!.has(viewerId);
    
    // Check if user is following viewer
    const isFollower = viewerId && viewerId !== user.id && followRelations.has(viewerId) && followRelations.get(viewerId)!.has(user.id);
    
    // Check if user is private
    const isPrivate = false; // In real app, get from user settings
    
    // Check if viewer is blocked
    const isBlocked = false; // In real app, check from block list
    
    return NextResponse.json({
      id: user.id,
      name: user.displayName,
      handle: user.handle,
      bio: user.bio || '',
      avatar: user.avatar,
      isPrivate,
      isFollowing,
      isFollower,
      isBlocked,
      counts: {
        posts: stats.posts,
        followers: stats.followers,
        following: stats.following,
        reachTotal: stats.reachTotal,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

