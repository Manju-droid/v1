'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  category: string;
}

const CATEGORIES = ['Technology', 'Entertainment', 'Politics', 'Sports', 'Education', 'General'];

// Section Component
const TrendingSection = ({ title, hashtags, onRowClick }: { title: string, hashtags: TrendingHashtag[], onRowClick: (slug: string) => void }) => {
  if (!hashtags || hashtags.length === 0) return null;

  return (
    <div className="mb-8">
      {title && <h3 className="text-xl font-bold text-gray-100 mb-4 px-1 border-l-4 border-cyan-500 pl-3">{title}</h3>}

      {/* Table - Desktop */}
      <div className="hidden lg:block bg-[#1F2937]/30 rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1F2937] border-b border-white/[0.08]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Hashtag</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Posts</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Momentum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {hashtags.map((hashtag, index) => (
              <motion.tr
                key={hashtag.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => onRowClick(hashtag.slug)}
                className="hover:bg-[#1F2937] cursor-pointer transition-colors"
                role="button"
              >
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">#{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">#{hashtag.name}</span>
                    {hashtag.momentum >= MOMENTUM_THRESHOLD && (
                      <span className="text-lg" role="img" aria-label="Trending">🔥</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-300">{hashtag.posts}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-300 font-medium bg-white/[0.02]">{hashtag.momentum}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Cards */}
      <div className="lg:hidden space-y-3">
        {hashtags.map((hashtag, index) => (
          <motion.div
            key={hashtag.slug}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onRowClick(hashtag.slug)}
            className="bg-[#1F2937]/50 border border-white/[0.06] rounded-lg p-4 cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">#{hashtag.name}</span>
                {hashtag.momentum >= MOMENTUM_THRESHOLD && <span className="text-lg">🔥</span>}
              </div>
              <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{hashtag.posts} posts</span>
              <span className="text-cyan-400">{hashtag.momentum} momentum</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default function TrendingPage() {
  const router = useRouter();
  const [trendingData, setTrendingData] = useState<{
    global: TrendingHashtag[];
    byCategory: Record<string, TrendingHashtag[]>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(CATEGORIES[0]);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        setLoading(true);
        const data = await hashtagAPI.getTrending();
        if (data) {
          // Helper to format API hashtag to local model
          const format = (h: any): TrendingHashtag => {
            const hashtagInfo = h.hashtag || h;
            return {
              slug: hashtagInfo.slug,
              name: hashtagInfo.name,
              posts: h.posts || ((h.boosts || 0) + (h.shouts || 0)),
              boosts: h.boosts || 0,
              shouts: h.shouts || 0,
              momentum: (h.boosts || 0) - (h.shouts || 0),
              category: hashtagInfo.category || 'General',
            };
          };

          // Process 24h data as main content
          const global = (data.trending_24h || []).map(format);

          const byCategory: Record<string, TrendingHashtag[]> = {};
          if (data.trending_by_category_24h) {
            Object.entries(data.trending_by_category_24h).forEach(([cat, list]) => {
              // @ts-ignore
              byCategory[cat] = (list || []).map(format);
            });
          }

          setTrendingData({ global, byCategory });
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

  // No local filtering/sorting needed as API returns curated lists

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

            {/* Content Container */}
            <div className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* Category Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    {CATEGORIES.map(category => (
                      <button
                        key={category}
                        onClick={() => setActiveTab(category)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${activeTab === category
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                          : 'bg-[#1F2937]/50 text-gray-400 hover:text-white hover:bg-[#1F2937] border border-white/[0.06]'
                          }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="min-h-[400px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Specific Category Top List */}
                        {(trendingData?.byCategory[activeTab] && trendingData.byCategory[activeTab].length > 0) ? (
                          <TrendingSection
                            title={`Top Trending in ${activeTab}`}
                            hashtags={trendingData.byCategory[activeTab] || []}
                            onRowClick={handleRowClick}
                          />
                        ) : (
                          <div className="text-center py-20 bg-[#1F2937]/30 rounded-2xl border border-white/[0.04]">
                            <div className="flex flex-col items-center gap-4">
                              <span className="text-4xl">📉</span>
                              <div>
                                <p className="text-gray-300 font-medium mb-1">No trending in {activeTab}</p>
                                <p className="text-gray-500 text-sm">Be the first to start a trend in this category!</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>


          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>

  );
}

