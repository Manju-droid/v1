'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LeftNav } from '@/components/feed/LeftNav';
import { MobileNav } from '@/components/feed/MobileNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { hashtagAPI } from '@v/api-client';

// Removed tab types - only showing trending topics

const MOMENTUM_THRESHOLD = 50; // Threshold for 🔥 icon
const MIN_POSTS_FOR_TRENDING = 100000; // Minimum 100k posts to appear in trending
const MAX_TRENDING_HASHTAGS = 10; // Show only top 10 trending hashtags

interface TrendingHashtag {
  slug: string;
  name: string;
  posts: number;
  boosts: number;
  shouts: number;
  momentum: number;
}

export default function TrendingPage() {
  const router = useRouter();
  // const { posts } = useStore(); // Removed
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        setLoading(true);
        const data = await hashtagAPI.list();
        if (data) {
          // Map API data to TrendingHashtag interface
          // Assuming API returns { slug, name, posts, boosts, shouts }
          // If not, we might need to adjust or mock the missing fields for now
          const formattedHashtags: TrendingHashtag[] = data.map((h: any) => ({
            slug: h.slug,
            name: h.name,
            posts: h.posts || 0,
            boosts: h.boosts || 0,
            shouts: h.shouts || 0,
            momentum: (h.boosts || 0) - (h.shouts || 0),
          }));
          setHashtags(formattedHashtags);
        }
      } catch (error) {
        console.error('Failed to load trending hashtags:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrending();
  }, []);

  // Calculate trending hashtags from posts // Removed as data comes from API
  // const trendingHashtags = useMemo(() => {
  //   const hashtagMap = new Map<string, TrendingHashtag>();

  //   // Initialize with mock hashtags
  //   mockHashtags.forEach(hashtag => {
  //     hashtagMap.set(hashtag.slug, {
  //       slug: hashtag.slug,
  //       name: hashtag.name,
  //       posts: 0,
  //       boosts: 0,
  //       shouts: 0,
  //       momentum: 0,
  //     });
  //   });

  //   // Calculate stats from posts (only posts with #boost or #shout)
  //   posts.forEach(post => {
  //     const content = post.content.toLowerCase();

  //     // Only count posts created via hashtag page composer
  //     const isHashtagPagePost = /#boost(\s|$)/.test(content) || content.endsWith('#boost') ||
  //                                /#shout(\s|$)/.test(content) || content.endsWith('#shout');
  //     if (!isHashtagPagePost) return;

  //     // Find all hashtags in the post
  //     const hashtagMatches = content.match(/#(\w+)/g);
  //     if (!hashtagMatches) return;

  //     hashtagMatches.forEach(match => {
  //       const hashtagSlug = match.replace('#', '').toLowerCase();
  //       const existing = hashtagMap.get(hashtagSlug);

  //       if (existing) {
  //         existing.posts += 1;
  //         if (content.includes('#boost')) existing.boosts += 1;
  //         if (content.includes('#shout')) existing.shouts += 1;
  //         existing.momentum = existing.boosts - existing.shouts;
  //       } else {
  //         // Create new hashtag entry
  //         const name = hashtagSlug.split('-').map(w => 
  //           w.charAt(0).toUpperCase() + w.slice(1)
  //         ).join(' ');

  //         hashtagMap.set(hashtagSlug, {
  //           slug: hashtagSlug,
  //           name,
  //           posts: 1,
  //           boosts: content.includes('#boost') ? 1 : 0,
  //           shouts: content.includes('#shout') ? 1 : 0,
  //           momentum: content.includes('#boost') ? 1 : content.includes('#shout') ? -1 : 0,
  //         });
  //       }
  //     });
  //   });

  //   return Array.from(hashtagMap.values());
  // }, [posts]);

  // Filter and sort trending hashtags
  const filteredAndSortedHashtags = useMemo(() => {
    let filtered = [...hashtags];

    // Only show hashtags with 100k+ posts (or lower for demo purposes if backend has less data)
    // For now, let's lower the threshold or remove it if data is scarce
    // filtered = filtered.filter(h => h.posts >= MIN_POSTS_FOR_TRENDING);

    // Sort by momentum (default) - higher momentum first
    filtered.sort((a, b) => b.momentum - a.momentum);

    // Show only top 10 trending hashtags
    return filtered.slice(0, MAX_TRENDING_HASHTAGS);
  }, [hashtags]);

  // Since we're only showing top 10, no need for infinite scroll
  const displayedHashtags = filteredAndSortedHashtags;

  const handleRowClick = (slug: string) => {
    router.push(`/hashtag/${slug}`);
  };

  return (
    <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0]">
      {/* Layout Container */}
      <div className="relative">
        {/* Top Header */}
        <FeedHeader />

        {/* Left Navigation */}
        <LeftNav />

        {/* Main Content */}
        <div className="lg:ml-[72px] xl:mr-[340px] min-h-screen pt-16">
          <div className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-6">
            {/* Sticky Header */}
            <div className="sticky top-16 z-10 bg-[#0C1117] pb-4 pt-4 border-b border-white/[0.06] mb-6">
              {/* Back Button */}
              <div className="mb-4">
                <motion.button
                  onClick={() => router.push('/hashtag')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to Hashtag Hub</span>
                </motion.button>
              </div>

              {/* Title */}
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Trending</h1>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Desktop: Table */}
              <div className="hidden lg:block">
                <table className="w-full">
                  <thead className="bg-[#1F2937] border-b border-white/[0.08] sticky top-32 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Hashtag
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Posts
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Boosts
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Shouts
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex justify-center">
                            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                          </div>
                        </td>
                      </tr>
                    ) : displayedHashtags.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                          <p className="text-sm">No trends yet—check back soon</p>
                        </td>
                      </tr>
                    ) : (
                      displayedHashtags.map((hashtag, index) => (
                        <motion.tr
                          key={hashtag.slug}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.02 }}
                          onClick={() => handleRowClick(hashtag.slug)}
                          className="bg-[#1F2937]/50 hover:bg-[#1F2937] cursor-pointer transition-colors"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleRowClick(hashtag.slug);
                            }
                          }}
                          role="button"
                          aria-label={`View ${hashtag.name} hashtag`}
                        >
                          <td className="px-4 py-4 text-sm text-gray-400">
                            {index + 1}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">
                                #{hashtag.name}
                              </span>
                              {hashtag.momentum >= MOMENTUM_THRESHOLD && (
                                <span className="text-lg" role="img" aria-label="Trending">🔥</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-300">
                            {hashtag.posts}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-300">
                            {hashtag.boosts}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-300">
                            {hashtag.shouts}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Cards */}
              <div className="lg:hidden space-y-3">
                {displayedHashtags.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-400">No trends yet—check back soon</p>
                  </div>
                ) : (
                  displayedHashtags.map((hashtag, index) => (
                    <motion.div
                      key={hashtag.slug}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                      onClick={() => handleRowClick(hashtag.slug)}
                      className="bg-[#1F2937]/50 hover:bg-[#1F2937] border border-white/[0.06] rounded-lg p-4 cursor-pointer transition-colors"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleRowClick(hashtag.slug);
                        }
                      }}
                      role="button"
                      aria-label={`View ${hashtag.name} hashtag`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">
                            #{hashtag.name}
                          </span>
                          {hashtag.momentum >= MOMENTUM_THRESHOLD && (
                            <span className="text-xl" role="img" aria-label="Trending">🔥</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Posts</div>
                          <div className="text-gray-300 font-medium">{hashtag.posts}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Boosts</div>
                          <div className="text-gray-300 font-medium">{hashtag.boosts}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Shouts</div>
                          <div className="text-gray-300 font-medium">{hashtag.shouts}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Empty state message */}
              {displayedHashtags.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">No trending hashtags yet—check back soon</p>
                  <p className="text-gray-500 text-xs mt-2">Hashtags need 100k+ posts to appear in trending</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </div>
  );
}

