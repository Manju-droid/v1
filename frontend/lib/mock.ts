// Mock data for development
// TODO: Replace with real API calls from lib/api-client.ts

export interface MockUser {
  id: string;
  displayName: string;
  handle: string;
  avatar: string;
  bio?: string;
  email?: string;
  followerCount?: number;
  followingCount?: number;
  languages?: string[]; // Array of language codes, first is primary, second is secondary
}

export interface MockPost {
  id: string;
  author: MockUser;
  content: string;
  timestamp: string;
  reactions: number;
  comments: number;
  commentCount?: number;
  saves: number;
  saveCount?: number;
  media?: { type: 'image' | 'video'; url: string }[];
  commentsDisabled?: boolean;
  commentLimit?: number;
  reach_24h?: number;
  reach_all?: number;
}

export interface MockComment {
  id: string;
  author: MockUser;
  content: string;
  timestamp: string;
  reactions: number;
  parentId: string | null;
}

// Mock users
export const mockUsers: MockUser[] = [
  {
    id: '1',
    displayName: 'Sarah Chen',
    handle: 'sarah_codes',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=b6e3f4',
    bio: 'Full-stack developer | TypeScript enthusiast',
    followerCount: 1234,
    followingCount: 567,
  },
  {
    id: '2',
    displayName: 'Alex Rivera',
    handle: 'alex_designs',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=c0aede',
    bio: 'UI/UX Designer | Creating beautiful experiences',
    followerCount: 2345,
    followingCount: 890,
  },
  {
    id: '3',
    displayName: 'Jamie Park',
    handle: 'jamie_tech',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jamie&backgroundColor=ffd5dc',
    bio: 'Tech blogger | AI & ML researcher',
    followerCount: 5678,
    followingCount: 432,
  },
];

// Mock posts
export const mockPosts: MockPost[] = [
  {
    id: 'post1',
    author: mockUsers[0],
    content: 'Just deployed my first Next.js 14 app with Server Components! The performance improvement is incredible. #webdev #nextjs',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    reactions: 450,
    comments: 23,
    commentCount: 23,
    saves: 12,
    saveCount: 12,
    reach_24h: 450,
    reach_all: 1234,
  },
  {
    id: 'post2',
    author: mockUsers[1],
    content: 'New design system drop! Check out my latest work on component libraries. What do you think? 🎨',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    reactions: 389,
    comments: 34,
    commentCount: 34,
    saves: 89,
    saveCount: 89,
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800',
      },
    ],
    reach_24h: 389,
    reach_all: 2456,
  },
  {
    id: 'post3',
    author: mockUsers[2],
    content: 'AI is transforming how we build software. Here are 5 tools every developer should know about in 2024... 🧵',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    reactions: 1234,
    comments: 156,
    commentCount: 156,
    saves: 234,
    saveCount: 234,
    reach_24h: 1234,
    reach_all: 5678,
  },
];

// Mock comments
export const mockComments: Record<string, MockComment[]> = {
  post1: [
    {
      id: 'comment1',
      author: mockUsers[1],
      content: 'This is amazing! I need to try this out.',
      timestamp: new Date(Date.now() - 3000000).toISOString(),
      reactions: 12,
      parentId: null,
    },
    {
      id: 'comment2',
      author: mockUsers[2],
      content: 'Great work! How does it compare to the old version?',
      timestamp: new Date(Date.now() - 2400000).toISOString(),
      reactions: 8,
      parentId: null,
    },
  ],
  post2: [
    {
      id: 'comment3',
      author: mockUsers[0],
      content: 'Love the color palette! 🎨',
      timestamp: new Date(Date.now() - 6000000).toISOString(),
      reactions: 5,
      parentId: null,
    },
  ],
  post3: [
    {
      id: 'comment4',
      author: mockUsers[1],
      content: 'This is exactly what I needed. Thank you!',
      timestamp: new Date(Date.now() - 9000000).toISOString(),
      reactions: 45,
      parentId: null,
    },
  ],
};

export function getComments(postId: string): MockComment[] {
  return mockComments[postId] || [];
}

export function getPostById(postId: string): MockPost | undefined {
  return mockPosts.find(p => p.id === postId);
}

export function getCommentById(postId: string, commentId: string): MockComment | undefined {
  const comments = mockComments[postId] || [];
  return comments.find(c => c.id === commentId);
}

export function getUserByHandle(handle: string): MockUser | undefined {
  return mockUsers.find(u => u.handle === handle);
}

// Utility functions
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h`;
  } else if (diffInSeconds < 604800) {
    return `${Math.floor(diffInSeconds / 86400)}d`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export function formatCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  } else if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`;
  } else {
    return `${(count / 1000000).toFixed(1)}M`;
  }
}

// Suggested users for "Who to Follow" section
export const suggestedUsers: MockUser[] = [
  {
    id: 'suggested1',
    displayName: 'Emma Watson',
    handle: 'emma_watson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=b6e3f4',
    bio: 'Actress & Activist',
    followerCount: 12345,
    followingCount: 234,
  },
  {
    id: 'suggested2',
    displayName: 'Tech Guru',
    handle: 'tech_guru',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TechGuru&backgroundColor=c0aede',
    bio: 'Sharing the latest in tech',
    followerCount: 5678,
    followingCount: 123,
  },
  {
    id: 'suggested3',
    displayName: 'Design Master',
    handle: 'design_master',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DesignMaster&backgroundColor=ffd5dc',
    bio: 'UI/UX Designer | Creative Director',
    followerCount: 8901,
    followingCount: 456,
  },
  {
    id: 'suggested4',
    displayName: 'Code Ninja',
    handle: 'code_ninja',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CodeNinja&backgroundColor=ffdfbf',
    bio: 'Full-stack developer | Open source enthusiast',
    followerCount: 3456,
    followingCount: 789,
  },
  {
    id: 'suggested5',
    displayName: 'Startup Founder',
    handle: 'startup_founder',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=StartupFounder&backgroundColor=b6e3f4',
    bio: 'Building the future, one startup at a time',
    followerCount: 6789,
    followingCount: 234,
  },
  {
    id: 'suggested6',
    displayName: 'Data Scientist',
    handle: 'data_scientist',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DataScientist&backgroundColor=c0aede',
    bio: 'ML Engineer | Data enthusiast',
    followerCount: 4567,
    followingCount: 567,
  },
];

