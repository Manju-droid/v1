'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { moderationAPI } from '@v/api-client';
import { useToast } from '@/components/ui/Toast';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { LeftNav } from '@/components/feed/LeftNav';
import Link from 'next/link';

interface ModerationPost {
  id: string;
  authorId: string;
  content: string;
  status: string;
  reportCount?: number;
  createdAt: string | Date;
}

export default function ModerationPage() {
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await moderationAPI.getQueue({ limit: 50, offset: 0 });
      setPosts(data);
    } catch (error: any) {
      addToast(error.message || 'Failed to load moderation queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (postId: string) => {
    setProcessing(postId);
    try {
      await moderationAPI.approvePost(postId);
      addToast('Post approved', 'success');
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error: any) {
      addToast(error.message || 'Failed to approve post', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (postId: string, applyPenalty: boolean = true) => {
    setProcessing(postId);
    try {
      await moderationAPI.rejectPost(postId, { applyPenalty });
      addToast('Post rejected', 'success');
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error: any) {
      addToast(error.message || 'Failed to reject post', 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0]">
      <div className="flex h-screen overflow-hidden">
        <LeftNav />

        <div className="flex-1 flex flex-col overflow-hidden">
          <FeedHeader />

          <div className="flex-1 overflow-y-auto pt-16">
            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Moderation Queue</h1>
                <button
                  onClick={loadQueue}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mx-auto"></div>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No posts in moderation queue</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-900/60 border border-white/[0.06] rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                              {post.reportCount || 0} reports
                            </span>
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                              {post.status}
                            </span>
                          </div>
                          <p className="text-white mb-2">{post.content}</p>
                          <p className="text-gray-400 text-xs">
                            Post ID: {post.id} · Author: {post.authorId}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(post.id)}
                          disabled={processing === post.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          {processing === post.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(post.id, true)}
                          disabled={processing === post.id}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          {processing === post.id ? 'Processing...' : 'Reject'}
                        </button>
                        <button
                          onClick={() => handleReject(post.id, false)}
                          disabled={processing === post.id}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          Reject (No Penalty)
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

