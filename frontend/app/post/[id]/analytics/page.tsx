'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LeftNav } from '@/components/feed/LeftNav';
import { MobileNav } from '@/components/feed/MobileNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { useStore, currentUserMock } from '@/lib/store';
import { formatCount } from '@/lib/mock';
import Link from 'next/link';

export default function PostAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const { posts } = useStore();
  
  const post = posts.find(p => p.id === postId);
  const [analytics, setAnalytics] = useState<{
    hourlyBuckets: Record<string, number>;
    sourceBreakdown: Record<string, number>;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'1h' | '24h' | '7d'>('24h');
  
  const isOwnPost = post?.author.id === currentUserMock?.id;
  
  useEffect(() => {
    if (!postId) return;
    
    setLoading(true);
    fetch(`/api/posts/${postId}/analytics?range=${range}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAnalytics(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch analytics:', err);
        setLoading(false);
      });
  }, [postId, range]);
  
  // Redirect if not own post
  useEffect(() => {
    if (post && !isOwnPost) {
      router.push(`/post/${postId}`);
    }
  }, [post, isOwnPost, postId, router]);
  
  if (!post) {
    return (
      <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0]">
        <FeedHeader />
        <LeftNav />
        <MobileNav />
        <main className="lg:ml-[72px] min-h-screen pt-16">
          <div className="max-w-[900px] mx-auto px-4 py-6">
            <p className="text-gray-400">Post not found</p>
          </div>
        </main>
      </div>
    );
  }
  
  if (!isOwnPost) {
    return null; // Will redirect
  }
  
  // Prepare chart data
  const chartData = analytics?.hourlyBuckets ? Object.entries(analytics.hourlyBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, count]) => ({
      time: new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      count,
    })) : [];
  
  const maxCount = chartData.length > 0 ? Math.max(...chartData.map(d => d.count)) : 1;
  
  const sourceLabels: Record<string, string> = {
    feed: 'Feed',
    hashtag: 'Hashtag',
    profile: 'Profile',
    search: 'Search',
  };
  
  return (
    <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0]">
      <FeedHeader />
      <LeftNav />
      <MobileNav />
      
      <main className="lg:ml-[72px] min-h-screen pt-16">
        <div className="max-w-[900px] mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <Link 
              href={`/post/${postId}`}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Post
            </Link>
            
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Post Analytics</h1>
            <p className="text-gray-400 text-sm">Unique accounts who saw this post</p>
          </div>
          
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4">
              <div className="text-gray-400 text-sm mb-1">24h Reach</div>
              <div className="text-2xl font-bold text-white">
                {loading ? '...' : formatCount(post.reach_24h || 0)}
              </div>
            </div>
            <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4">
              <div className="text-gray-400 text-sm mb-1">All-Time Reach</div>
              <div className="text-2xl font-bold text-white">
                {loading ? '...' : formatCount(post.reach_all || 0)}
              </div>
            </div>
            <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4">
              <div className="text-gray-400 text-sm mb-1">Total Impressions</div>
              <div className="text-2xl font-bold text-white">
                {loading ? '...' : formatCount(analytics?.total || 0)}
              </div>
            </div>
          </div>
          
          {/* Time Range Selector */}
          <div className="mb-6">
            <div className="flex gap-2">
              {(['1h', '24h', '7d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    range === r
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-gray-900/60 text-gray-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {r === '1h' ? '1 Hour' : r === '24h' ? '24 Hours' : '7 Days'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Chart */}
          {loading ? (
            <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
              <div className="text-gray-400 text-center">Loading analytics...</div>
            </div>
          ) : chartData.length > 0 ? (
            <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Reach by Hour ({range})</h2>
              <div className="flex items-end gap-2 h-48">
                {chartData.map(({ time, count }, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="relative w-full flex items-end justify-center" style={{ height: '180px' }}>
                      <div
                        className="w-full bg-cyan-500/30 rounded-t transition-all hover:bg-cyan-500/50"
                        style={{ height: `${(count / maxCount) * 100}%` }}
                        title={`${time}: ${count} views`}
                      />
                    </div>
                    <div className="text-xs text-gray-500 text-center transform -rotate-45 origin-top-left whitespace-nowrap">
                      {time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 mb-6">
              <div className="text-gray-400 text-center">No data available for this time range</div>
            </div>
          )}
          
          {/* Source Breakdown */}
          {analytics?.sourceBreakdown && Object.keys(analytics.sourceBreakdown).length > 0 && (
            <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Reach by Source</h2>
              <div className="space-y-3">
                {Object.entries(analytics.sourceBreakdown).map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-gray-300 capitalize">{sourceLabels[source] || source}</span>
                    <span className="text-white font-semibold">{formatCount(count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

