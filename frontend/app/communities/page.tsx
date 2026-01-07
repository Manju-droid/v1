'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

import { LeftNav } from '@/components/feed/LeftNav';
import { MobileNav } from '@/components/feed/MobileNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { RightSidebar } from '@/components/feed/RightSidebar';

interface Community {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  memberCount: number;
  postCount: number;
}

const CATEGORIES = [
  'All',
  'Politics',
  'Entertainment',
  'Technology',
  'Sports',
  'Education',
  'General',
];

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetch('http://localhost:8080/api/communities')
      .then((res) => res.json())
      .then((response) => {
        setCommunities(response.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch communities', err);
        setLoading(false);
      });
  }, []);

  // Filter and group communities
  const { groupedCommunities, flatCommunities } = useMemo(() => {
    // First filter by search
    const filtered = communities.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Then filter by category if not All
    const categoryFiltered = activeCategory === 'All'
      ? filtered
      : filtered.filter(c => c.category === activeCategory);

    // Group for "All" view
    const grouped: Record<string, Community[]> = {};
    if (activeCategory === 'All') {
      // Only show categories that have results
      CATEGORIES.slice(1).forEach(cat => { // Skip 'All'
        const inCat = categoryFiltered.filter(c => c.category === cat || (!c.category && cat === 'General'));
        if (inCat.length > 0) grouped[cat] = inCat;
      });
    }

    return {
      groupedCommunities: grouped,
      flatCommunities: categoryFiltered // Used when a specific category is active
    };
  }, [communities, searchQuery, activeCategory]);

  return (
    <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0]">
      <div className="relative">
        <FeedHeader />
        <LeftNav />

        <main className="lg:ml-[72px] xl:mr-[340px] min-h-screen pt-16">
          <div className="max-w-[900px] mx-auto px-4 py-6 pb-24 lg:pb-6">

            {/* Header & Create Button */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Communities</h1>
              <Link
                href="/communities/create"
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/20"
              >
                Create Community
              </Link>
            </div>

            {/* Search Bar */}
            <div className="mb-6 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search communities..."
                className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all pl-12"
              />
              <svg className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${activeCategory === category
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                      : 'bg-gray-900/60 text-gray-400 hover:text-white hover:bg-gray-800 border border-white/5'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading communities...</div>
            ) : flatCommunities.length === 0 ? (
              <div className="text-center py-12 bg-gray-900/40 rounded-xl border border-white/5">
                <div className="flex flex-col items-center gap-3">
                  <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <p className="text-gray-400">
                    {searchQuery ? `No communities found for "${searchQuery}"` : 'No communities found.'}
                  </p>
                  <Link href="/communities/create" className="text-cyan-400 hover:text-cyan-300">Create one!</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Render Grouped Sections if "All" is selected */}
                {activeCategory === 'All' ? Object.entries(groupedCommunities).map(([category, items]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-3 border-l-4 border-cyan-500 pl-3">
                      <h2 className="text-xl font-bold text-white">{category}</h2>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {items.map((community) => (
                        <CommunityCard key={community.id} community={community} />
                      ))}
                    </div>
                  </div>
                )) : (
                  /* Render Single Gird if a specific category is selected */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {flatCommunities.map((community) => (
                      <CommunityCard key={community.id} community={community} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <RightSidebar />
        <MobileNav />
      </div>
    </div>
  );
}

function CommunityCard({ community }: { community: Community }) {
  return (
    <Link
      href={`/communities/${community.id}`}
      className="block bg-gray-900/40 rounded-xl overflow-hidden border border-white/5 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10 group"
    >
      <div className="h-32 bg-gray-800 relative group-hover:opacity-90 transition-opacity">
        {community.imageUrl ? (
          <img
            src={community.imageUrl}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800/50 text-gray-600">
            <svg className="w-12 h-12 opacity-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium border border-white/10">
          {community.category}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
          {community.name}
        </h3>
        <p className="text-sm text-gray-400 line-clamp-2 mb-4 h-10">
          {community.description}
        </p>
        <div className="flex justify-between text-xs text-gray-500 border-t border-white/5 pt-3">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            {community.memberCount}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
            {community.postCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
