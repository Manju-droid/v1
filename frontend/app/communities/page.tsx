'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

import { LeftNav } from '@/components/feed/LeftNav';
import { MobileNav } from '@/components/feed/MobileNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { RightSidebar } from '@/components/feed/RightSidebar';

import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface Community {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  memberCount: number;
  postCount: number;
  creatorId: string;
}

const CATEGORIES = [
  'Joined',
  'All',
  'Politics',
  'Entertainment',
  'Technology',
  'Sports',
  'Education',
  'General',
];

import { useAuth } from '@/features/auth';

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const { currentUser } = useStore();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    // Only fetch if authenticated (or if we want to show public communities, but req implies protected)
    // The previous code didn't strictly require auth for the page, but useAuth is cleaner.
    // If not authenticated, we redirect anyway.
    if (authLoading || !isAuthenticated) return;

    setLoading(true);
    let url = 'http://localhost:8080/api/communities';
    const headers: HeadersInit = {};

    if (activeCategory === 'Joined') {
      url = 'http://localhost:8080/api/communities/joined';
      const token = getCookie('v_auth') || localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Not logged in, can't view joined
        setCommunities([]);
        setLoading(false);
        return;
      }
    }

    fetch(url, { headers })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((response) => {
        // Handle both simple array response (from joined endpoint if modified) or standard response structure
        // The backend List returns just data, checking structure...
        // Backend List wraps in JSON(w, 200, communities) -> communities is array.
        // But handler uses JSON helper? If JSON helper wraps in { data: ... } check that.
        // My previous view of page.tsx used `response.data || []`.
        // Let's assume standard wrapper is present.
        setCommunities(Array.isArray(response) ? response : (response.data || []));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch communities', err);
        setCommunities([]);
        setLoading(false);
      });
  }, [activeCategory]);

  const handleCommunityDeleted = (id: string) => {
    setCommunities(prev => prev.filter(c => c.id !== id));
  };

  // Filter and group communities
  const { groupedCommunities, flatCommunities } = useMemo(() => {
    // First filter by search
    const filtered = communities.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter by category
    let categoryFiltered = filtered;
    if (activeCategory !== 'All' && activeCategory !== 'Joined') {
      categoryFiltered = filtered.filter(c => c.category === activeCategory);
    }
    // If 'Joined' or 'All', we show everything returned by the API (which is already filtered for Joined)

    // Grouping
    const grouped: Record<string, Community[]> = {};

    // For "All" OR "Joined", we can group by category for better display
    if (activeCategory === 'All' || activeCategory === 'Joined') {
      CATEGORIES.slice(2).forEach(cat => { // Skip Joined and All
        const inCat = filtered.filter(c => c.category === cat || (!c.category && cat === 'General'));
        if (inCat.length > 0) grouped[cat] = inCat;
      });
    }

    return {
      groupedCommunities: grouped,
      flatCommunities: categoryFiltered
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
                    {searchQuery
                      ? `No communities found for "${searchQuery}"`
                      : activeCategory === 'Joined'
                        ? 'You haven\'t joined any communities yet.'
                        : 'No communities found.'}
                  </p>
                  <Link href="/communities/create" className="text-cyan-400 hover:text-cyan-300">Create one!</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Render Grouped Sections if "All" OR "Joined" is selected */}
                {(activeCategory === 'All' || activeCategory === 'Joined') ? Object.entries(groupedCommunities).map(([category, items]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-3 border-l-4 border-cyan-500 pl-3">
                      <h2 className="text-xl font-bold text-white">{category}</h2>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>

                    <div className="flex overflow-x-auto gap-6 pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                      {items.map((community) => (
                        <div key={community.id} className="w-[280px] md:w-[320px] flex-none">
                          <CommunityCard
                            community={community}
                            currentUser={currentUser}
                            onDelete={handleCommunityDeleted}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  /* Render Single Grid if a specific category is selected */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {flatCommunities.map((community) => (
                      <CommunityCard
                        key={community.id}
                        community={community}
                        currentUser={currentUser}
                        onDelete={handleCommunityDeleted}
                      />
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

function CommunityCard({ community, currentUser, onDelete }: { community: Community; currentUser: any; onDelete: (id: string) => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onMenuDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    setShowConfirm(true);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);

    try {
      const token = getCookie('v_auth') || localStorage.getItem('auth_token');
      const res = await fetch(`http://localhost:8080/api/communities/${community.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        onDelete(community.id);
      } else {
        const errorText = await res.text();
        alert(`Failed to delete: ${errorText}`);
        setIsDeleting(false);
        setShowConfirm(false);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="block bg-gray-900/40 rounded-xl overflow-hidden border border-white/5 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10 group relative h-[250px]">
      <Link href={`/communities/${community.id}`} className="block h-full flex flex-col">
        <div className="h-32 bg-gray-800 relative group-hover:opacity-90 transition-opacity shrink-0">
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
        </div>
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors line-clamp-1">
              {community.name}
            </h3>
            <p className="text-sm text-gray-400 line-clamp-2 h-10">
              {community.description}
            </p>
          </div>
          <div className="flex justify-between text-xs text-gray-500 border-t border-white/5 pt-3 mt-2">
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

      {/* Floating Elements (Category & Menu) - Outside Link */}
      <div className="absolute top-2 right-2 flex gap-2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium border border-white/10 pointer-events-auto">
          {community.category}
        </div>

        {/* 3 Dots Menu - Only for creator */}
        {currentUser?.id === community.creatorId && !showConfirm && (
          <div className="relative z-10 pointer-events-auto">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="bg-black/60 backdrop-blur-sm p-1 rounded text-white/70 hover:text-white border border-white/10 hover:bg-black/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 mt-2 w-32 bg-[#1C2128] border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={onMenuDeleteClick}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 bg-[#0C1117]/95 z-50 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-3 text-red-500 border border-red-500/20">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <p className="text-white font-bold mb-1">Delete {community.name}?</p>
          <p className="text-xs text-gray-400 mb-4">This cannot be undone.</p>
          <div className="flex gap-2 w-full justify-center">
            <button
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors border border-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors flex items-center gap-1.5"
            >
              {isDeleting ? 'Deleting...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
