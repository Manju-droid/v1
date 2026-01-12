// Mock debate data
// TODO: Replace with real API calls from lib/api-client.ts

export interface MockDebate {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'live' | 'ended';
  agreeSide: number;
  disagreeSide: number;
  host?: {
    id: string;
    displayName: string;
    handle: string;
    avatar: string;
    isPlatinum?: boolean;
  };
  hostId?: string; // For backend debates that only return hostId
  category: string;
  totalParticipants?: number;
  isAI?: boolean;
  isLocked?: boolean;
  unlockPhase?: number;
  earlyAccessRoles?: string[];
}

export const mockDebates: MockDebate[] = [
  {
    id: 'deb1',
    title: 'AI Will Replace Human Programmers by 2030',
    description: 'Join us for a heated debate about the future of software development and AI capabilities.',
    startTime: new Date(Date.now() - 3600000).toISOString(), // Started 1 hour ago
    endTime: new Date(Date.now() + 3600000).toISOString(), // Ends in 1 hour
    status: 'live',
    agreeSide: 45,
    disagreeSide: 67,
    host: {
      id: 'host1',
      displayName: 'Tech Debates',
      handle: 'tech_debates',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TechDebates&backgroundColor=b6e3f4',
      isPlatinum: false,
    },
    category: 'Technology',
    totalParticipants: 112,
    isLocked: true,
    unlockPhase: 2,
  },
  {
    id: 'deb2',
    title: 'Remote Work is Better Than Office Work',
    description: 'The great work location debate: productivity, culture, and work-life balance.',
    startTime: new Date(Date.now() - 1800000).toISOString(), // Started 30 mins ago
    endTime: new Date(Date.now() + 1800000).toISOString(), // Ends in 30 mins
    status: 'live',
    agreeSide: 123,
    disagreeSide: 98,
    host: {
      id: 'host2',
      displayName: 'Work Culture',
      handle: 'work_culture',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=WorkCulture&backgroundColor=c0aede',
      isPlatinum: false,
    },
    category: 'Lifestyle',
    totalParticipants: 221,
    isLocked: true,
    unlockPhase: 2,
  },
  {
    id: 'deb3',
    title: 'Social Media Does More Harm Than Good',
    description: 'Examining the impact of social platforms on mental health and society.',
    startTime: new Date(Date.now() - 5400000).toISOString(), // Started 1.5 hours ago
    endTime: new Date(Date.now() + 1800000).toISOString(), // Ends in 30 mins
    status: 'live',
    agreeSide: 234,
    disagreeSide: 189,
    host: {
      id: 'host3',
      displayName: 'Social Issues',
      handle: 'social_issues',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SocialIssues&backgroundColor=ffd5dc',
      isPlatinum: false,
    },
    category: 'Society',
    totalParticipants: 423,
    isLocked: true,
    unlockPhase: 2,
  },
  {
    id: 'deb4',
    title: 'Electric Vehicles Are The Future of Transportation',
    description: 'Discussing sustainability, technology, and the transition to electric vehicles.',
    startTime: new Date(Date.now() - 2700000).toISOString(), // Started 45 mins ago
    endTime: new Date(Date.now() + 2700000).toISOString(), // Ends in 45 mins
    status: 'live',
    agreeSide: 78,
    disagreeSide: 45,
    host: {
      id: 'host4',
      displayName: 'Green Tech',
      handle: 'green_tech',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=GreenTech&backgroundColor=b6e3f4',
      isPlatinum: false,
    },
    category: 'Environment',
    totalParticipants: 123,
    isLocked: true,
    unlockPhase: 2,
  },
  {
    id: 'deb5',
    title: 'Universal Basic Income Should Be Implemented',
    description: 'Economic policy debate: feasibility, funding, and societal impact of UBI.',
    startTime: new Date(Date.now() - 900000).toISOString(), // Started 15 mins ago
    endTime: new Date(Date.now() + 4500000).toISOString(), // Ends in 1.25 hours
    status: 'live',
    agreeSide: 156,
    disagreeSide: 201,
    host: {
      id: 'host5',
      displayName: 'Economics 101',
      handle: 'economics_101',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Economics&backgroundColor=c0aede',
      isPlatinum: false,
    },
    category: 'Politics',
    totalParticipants: 357,
    isLocked: true,
    unlockPhase: 2,
  },
  {
    id: 'deb6',
    title: 'Cryptocurrency Will Replace Traditional Banking',
    description: 'Exploring the future of digital currencies and decentralized finance.',
    startTime: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
    endTime: new Date(Date.now() + 10800000).toISOString(), // 3 hours from now
    status: 'upcoming',
    agreeSide: 89,
    disagreeSide: 134,
    host: {
      id: 'host6',
      displayName: 'Crypto Insights',
      handle: 'crypto_insights',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=CryptoInsights&backgroundColor=ffd5dc',
      isPlatinum: false,
    },
    category: 'Finance',
    totalParticipants: 223,
    isLocked: true,
    unlockPhase: 2,
  },
  {
    id: 'deb7',
    title: 'Climate Change Requires Immediate Action',
    description: 'Debating the urgency and methods of addressing climate change.',
    startTime: new Date(Date.now() + 14400000).toISOString(), // 4 hours from now
    endTime: new Date(Date.now() + 18000000).toISOString(), // 5 hours from now
    status: 'upcoming',
    agreeSide: 267,
    disagreeSide: 98,
    host: {
      id: 'host7',
      displayName: 'Climate Action',
      handle: 'climate_action',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ClimateAction&backgroundColor=b6e3f4',
      isPlatinum: false,
    },
    category: 'Environment',
    totalParticipants: 365,
    isLocked: true,
    unlockPhase: 2,
  },
  {
    id: 'deb8',
    title: 'Online Education is Superior to Traditional Classrooms',
    description: 'Comparing the effectiveness of digital vs. in-person learning.',
    startTime: new Date(Date.now() + 21600000).toISOString(), // 6 hours from now
    endTime: new Date(Date.now() + 25200000).toISOString(), // 7 hours from now
    status: 'upcoming',
    agreeSide: 145,
    disagreeSide: 178,
    host: {
      id: 'host8',
      displayName: 'Education Hub',
      handle: 'education_hub',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=EducationHub&backgroundColor=c0aede',
      isPlatinum: false,
    },
    category: 'Education',
    totalParticipants: 323,
    isLocked: true,
    unlockPhase: 2,
  },
  {
    id: 'deb9',
    title: 'The Future of Neural Interfaces',
    description: 'A deep dive into Brain-Computer Interfaces and their ethical implications. Join early access to discuss.',
    startTime: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
    endTime: new Date(Date.now() + 90000000).toISOString(),
    status: 'upcoming',
    agreeSide: 12,
    disagreeSide: 8,
    host: {
      id: 'host9',
      displayName: 'Future Tech',
      handle: 'future_tech',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=FutureTech&backgroundColor=b6e3f4',
      isPlatinum: true,
    },
    category: 'Technology',
    totalParticipants: 20,
    isLocked: true,
    unlockPhase: 2,
    earlyAccessRoles: ['VIP'],
  },
];

export function getDebateById(id: string): MockDebate | undefined {
  return mockDebates.find(d => d.id === id);
}

export function getDebatesByStatus(status: 'upcoming' | 'live' | 'ended'): MockDebate[] {
  return mockDebates.filter(d => d.status === status);
}

export function getLiveDebates(): MockDebate[] {
  return mockDebates.filter(d => d.status === 'live');
}

export function getRunningDebates(): MockDebate[] {
  return mockDebates.filter(d => d.status === 'live');
}

export function getUpcomingDebates(): MockDebate[] {
  return mockDebates.filter(d => d.status === 'upcoming');
}

// Type alias for compatibility
export type Debate = MockDebate;

// Time utility functions
export function getTimeRemaining(endTime: string): string {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) {
    return 'Ended';
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `Ends in ${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `Ends in ${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `Ends in ${minutes}m`;
  } else {
    return `Ends in ${seconds}s`;
  }
}

export function getStartTime(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diff = start - now;

  if (diff <= 0) {
    return 'Started';
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `in ${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `in ${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `in ${minutes}m`;
  } else {
    return `in ${seconds}s`;
  }
}


export function generateMockParticipants(count: number): any[] {
  const sides = ['agree', 'disagree'] as const;
  return Array.from({ length: count }).map((_, i) => {
    // Alternate sides to ensure balance
    const side = sides[i % 2];
    const id = `mock-user-${i + 1}`;
    const name = `User ${i + 1}`;
    return {
      id,
      displayName: name,
      handle: `user${i + 1}`,
      avatar: `https://ui-avatars.com/api/?name=${name}&background=random`,
      side,
      isHost: false,
      isSpeaking: false,
      hasSwitched: false,
      isMutedByHost: false,
    };
  });
}
