'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { useStore } from '@/lib/store';
import { PulseIcon } from '@/components/icons/PulseIcon';
import { SplineShareIcon } from '@/components/icons/SplineShareIcon';
import { motion } from 'framer-motion';
// Assuming we can reuse existing components or build simple ones
// import PostCard from '@/features/posts/components/PostCard'; // If available

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
}

interface Post {
    id: string;
    content: string;
    author: {
        name: string;
        handle: string;
        avatarUrl: string;
        displayName: string;
    };
    postType?: string;
    topicTag?: string;
    responseToPostId?: string;
    responseToPost?: Post; // Enriched
    createdAt: string;
    mediaUrl?: string;
    mediaType?: string;
    reactionCount?: number;
    reachAll?: number; // Added for views
    reacted?: boolean; // For like state
    saved?: boolean;
}

export default function CommunityFeedPage() {
    const { id } = useParams();
    const router = useRouter();
    const { addToast } = useToast();
    const { toggleReact, syncCurrentUser } = useStore();
    const currentUser = useStore(state => state.currentUser);

    const [community, setCommunity] = useState<Community | null>(null);
    const [isMember, setIsMember] = useState(false);
    const [isPending, setIsPending] = useState(false); // New pending state
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [membershipLoading, setMembershipLoading] = useState(true);
    const [joinLoading, setJoinLoading] = useState(false);
    const [posting, setPosting] = useState(false);

    // Sync user on mount
    useEffect(() => {
        syncCurrentUser();
    }, [syncCurrentUser]);

    // Composer state
    const [newPostContent, setNewPostContent] = useState('');
    const [activeTab, setActiveTab] = useState('Discussion');
    const [selectedTag, setSelectedTag] = useState('');

    // Reply Request State
    const [replyingToPost, setReplyingToPost] = useState<Post | null>(null);

    const handleReaction = async (post: Post) => {
        if (!isMember) {
            addToast('Join the community to like posts', 'error');
            return;
        }
        try {
            await toggleReact(post.id);
            // Optimistic update
            setPosts(current => current.map(p => {
                if (p.id === post.id) {
                    return {
                        ...p,
                        reacted: !p.reacted,
                        reactionCount: (p.reactionCount || 0) + (p.reacted ? -1 : 1)
                    };
                }
                return p;
            }));
        } catch (error) {
            console.error('Failed to toggle reaction:', error);
            addToast('Failed to update reaction', 'error');
        }
    };

    const handleShare = (post: Post) => {
        if (!isMember) {
            addToast('Join the community to share posts', 'error');
            return;
        }
        const url = `${window.location.origin}/post/${post.id}`;
        navigator.clipboard.writeText(url);
        addToast('Link copied to clipboard', 'success');
    };

    const fetchCommunity = useCallback(async () => {
        try {
            const res = await fetch(`http://localhost:8080/api/communities/${id}`);
            if (!res.ok) throw new Error('Failed to fetch community');
            const response = await res.json();
            setCommunity(response.data || null);
        } catch (err) {
            console.error(err);
        }
    }, [id]);

    // DEBUG: Trace execution
    console.log('RENDER: CommunityPage. currentUser:', currentUser?.id, 'id:', id);

    const checkMembership = useCallback(async () => {
        console.log('FUNC: checkMembership called. currentUser:', currentUser?.id);
        if (!currentUser?.id) {
            console.log('ABORT: checkMembership - no user');
            setMembershipLoading(false); // No user means check is 'done' (not member)
            return;
        }
        try {
            console.log('FETCH: Checking membership for', currentUser.id);
            const res = await fetch(`http://localhost:8080/api/communities/${id}/members/${currentUser.id}`);
            if (res.ok) {
                const data = await res.json();
                console.log('Membership check response:', data);
                if (data.status === 'pending') {
                    console.log('Setting isPending to true');
                    setIsPending(true);
                    setIsMember(false); // Treat pending as not yet a member for UI purposes
                } else {
                    console.log('Setting isPending to false, status:', data.status);
                    setIsPending(false);
                    setIsMember(data.isMember);
                }
            }
        } catch (error) {
            console.error('Failed to check membership:', error);
        } finally {
            setMembershipLoading(false);
        }
    }, [id, currentUser?.id]);

    const fetchPosts = useCallback(async () => {
        try {
            const res = await fetch(`http://localhost:8080/api/posts?communityId=${id}`);
            if (res.ok) {
                const response = await res.json();
                // PostHandlers.List returns { posts: [...] }. Wrapped -> { data: { posts: [...] } }
                setPosts(response.data?.posts || []);
            }
        } catch (err) {
            console.error(err);
        }
    }, [id]);

    useEffect(() => {
        console.log('EFFECT: Dependencies changed. id:', id, 'User:', currentUser?.id);
        if (id) {
            // Initial data fetch (community & posts)
            setLoading(true);
            Promise.all([fetchCommunity(), fetchPosts()])
                .finally(() => setLoading(false));
        }
    }, [id, fetchCommunity, fetchPosts]);

    // Separate effect for membership check to react to currentUser changes specifically
    useEffect(() => {
        setMembershipLoading(true); // Reset loading when dependencies change
        if (id && currentUser?.id) {
            console.log('EFFECT: User available, checking membership');
            checkMembership();
        } else {
            console.log('EFFECT: Skipping membership check - no user or id');
            // If we have an ID but no user, we might be logged out, so membership check is effectively 'done' (false)
            // But we might be waiting for syncCurrentUser.
            // Let's set timeout or rely on syncCurrentUser finishing quickly.
            // Actually, if currentUser is missing initially, we set loading false above.
            // If syncCurrentUser runs, currentUser updates -> effect runs again -> loading true -> check -> loading false.
            if (id) setMembershipLoading(false);
        }
    }, [id, currentUser, checkMembership]);

    const handleJoinCommunity = async () => {
        if (!currentUser) {
            addToast('Please login to join the community', 'error');
            return;
        }

        setJoinLoading(true);
        try {
            const token = localStorage.getItem('auth_token') || 'demo-token';
            const res = await fetch(`http://localhost:8080/api/communities/${id}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: currentUser.id }),
            });

            if (res.ok) {
                // Simulate approval required workflow
                setIsPending(true);
                addToast('Join request sent! Waiting for admin approval.', 'success');
            } else {
                const errorText = await res.text();
                // Check if already member (backend adds newline to http.Error)
                if (res.status === 400 && (errorText.includes('Already a member') || errorText.trim() === 'Already a member')) {
                    console.log('User already a member/pending (400 caught), syncing state...');
                    await checkMembership();
                } else {
                    addToast('Failed to join community', 'error');
                }
            }
        } catch (error) {
            console.error('Failed to join community:', error);
            addToast('Failed to join community', 'error');
        } finally {
            setJoinLoading(false);
        }
    };

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to leave this community?')) return;
        setJoinLoading(true);
        try {
            const token = localStorage.getItem('auth_token') || 'demo-token';
            const res = await fetch(`http://localhost:8080/api/communities/${id}/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
            if (res.ok) {
                setIsMember(false);
                fetchCommunity(); // Refresh member count
            }
        } catch (err) {
            console.error(err);
        } finally {
            setJoinLoading(false);
        }
    };

    const getTopicTags = (category: string) => {
        switch (category) {
            case 'Politics': return ['Elections', 'Policy', 'Geopolitics'];
            case 'Entertainment': return ['Movies', 'Music', 'Celebrities'];
            case 'Technology': return ['AI', 'Coding', 'Gadgets'];
            case 'Sports': return ['Match', 'Transfer', 'Discussion'];
            case 'Education': return ['Study', 'Career', 'Research'];
            case 'General': return ['Life', 'Advice', 'OffMyChest'];
            default: return ['General'];
        }
    };

    const handlePostSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeTab || !selectedTag) {
            addToast('Please select a post type and topic tag', 'error');
            return;
        }

        if (!currentUser || !community) {
            addToast('You must be logged in and viewing a valid community to post', 'error');
            return;
        }

        setPosting(true);

        try {
            const payload: any = {
                authorId: currentUser.id,
                content: newPostContent,
                communityId: community.id,
                postType: activeTab,
                topicTag: selectedTag,
                isHashtagPost: false,
                commentsDisabled: true, // Always disable comments in community posts
            };

            if (replyingToPost) {
                payload.responseToPostId = replyingToPost.id;
            }

            const token = localStorage.getItem('auth_token') || 'demo-token';
            const res = await fetch('http://localhost:8080/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt);
            }

            // Refresh posts
            await Promise.all([
                // Re-fetch posts to see new one
                fetch(`http://localhost:8080/api/posts?communityId=${community.id}`)
                    .then(r => r.json())
                    .then(data => setPosts(data.data?.posts || [])),
                // Refresh community stats
                fetch(`http://localhost:8080/api/communities/${id}`)
                    .then(r => r.json())
                    .then(data => setCommunity(data.data))
            ]);

            setNewPostContent('');
            setReplyingToPost(null); // Clear reply state
            addToast('Posted successfully!', 'success');
        } catch (err: any) {
            console.error('Failed to post:', err);
            addToast('Failed to post', 'error');
        } finally {
            setPosting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    if (!community) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Community not found</h1>
                    <Link href="/feed" className="text-cyan-400 hover:underline">Return to Feed</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0]">
            <div className="relative">
                <FeedHeader />
                <LeftNav />

                <main className="lg:ml-[72px] xl:mr-[340px] min-h-screen pt-16">
                    <div className="max-w-[900px] mx-auto px-4 py-6 pb-24 lg:pb-6">
                        {/* Banner */}
                        <div className="h-48 rounded-xl overflow-hidden relative mb-6 border border-white/5">
                            <img
                                src={community.imageUrl || "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop"}
                                alt={community.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                                <div className="absolute bottom-0 left-0 p-6 w-full">
                                    <h1 className="text-3xl font-bold text-white mb-1">{community.name}</h1>
                                    <p className="text-gray-300 text-sm mb-2">{community.description}</p>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">{community.category}</span>
                                        <span className="text-sm text-gray-400 font-medium">{community.memberCount} Members</span>
                                    </div>
                                </div>
                                <div className="absolute bottom-6 right-6">
                                    {membershipLoading ? (
                                        <div className="px-6 py-2 bg-transparent">
                                            {/* Invisible placeholder or spinner */}
                                            <div className="w-6 h-6 animate-spin rounded-full border-2 border-white/20 border-t-cyan-500 mx-auto"></div>
                                        </div>
                                    ) : isMember ? (
                                        <button
                                            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-all border border-white/10 backdrop-blur-sm"
                                        >
                                            Joined
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleJoinCommunity}
                                            disabled={joinLoading || isPending}
                                            className={`px-6 py-2 rounded-full font-semibold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 ${isPending
                                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed border border-gray-500'
                                                : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white'
                                                }`}
                                        >
                                            {joinLoading ? (
                                                <>Joining...</>
                                            ) : isPending ? (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Request Sent
                                                </>
                                            ) : (
                                                'Join Community'
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                            {/* Main Feed */}
                            <div className="space-y-6">
                                {/* Post Composer - Only if member */}
                                {isMember ? (
                                    <div className="bg-gray-900/40 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                                        {/* Reply Context in Composer */}
                                        {replyingToPost && (
                                            <div className="mb-4 bg-gray-900/50 rounded-lg p-3 border border-cyan-500/30 flex items-start justify-between">
                                                <div>
                                                    <span className="text-xs text-cyan-400 font-medium block mb-1">Replying to @{replyingToPost.author?.displayName}</span>
                                                    <p className="text-sm text-gray-400 line-clamp-1">{replyingToPost.content}</p>
                                                </div>
                                                <button
                                                    onClick={() => setReplyingToPost(null)}
                                                    className="text-gray-500 hover:text-white"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        )}
                                        <form onSubmit={handlePostSubmit}>
                                            <textarea
                                                value={newPostContent}
                                                onChange={(e) => setNewPostContent(e.target.value)}
                                                placeholder={`What's on your mind?`}
                                                className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 min-h-[100px] mb-3 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 border border-white/5 resize-none"
                                            />
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex gap-2">
                                                    <select
                                                        value={activeTab}
                                                        onChange={(e) => setActiveTab(e.target.value)}
                                                        className="bg-gray-800 text-xs text-gray-300 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50"
                                                    >
                                                        <option value="">Type</option>
                                                        <option value="Question">Question</option>
                                                        <option value="Discussion">Discussion</option>
                                                        <option value="Resource">Resource</option>
                                                        <option value="Announcement">Announcement</option>
                                                    </select>

                                                    <select
                                                        value={selectedTag}
                                                        onChange={(e) => setSelectedTag(e.target.value)}
                                                        className="bg-gray-800 text-xs text-gray-300 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50"
                                                    >
                                                        <option value="">Topic</option>
                                                        {getTopicTags(community.category).map(tag => (
                                                            <option key={tag} value={tag}>{tag}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
                                                    {posting ? 'Posting...' : 'Post'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                ) : (
                                    <div className="bg-gray-900/40 rounded-xl p-6 border border-white/5 text-center">
                                        <p className="text-gray-400">Join {community.name} to start posting!</p>
                                    </div>
                                )}

                                {/* Posts List */}
                                <div className="space-y-6">
                                    {posts.length === 0 ? (
                                        <div className="text-center text-gray-500 py-12 bg-gray-900/20 rounded-xl border border-white/5">
                                            No posts yet. Be the first to say something!
                                        </div>
                                    ) : (
                                        posts.map(post => (
                                            <div key={post.id} className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-4 sm:p-6 mb-4">
                                                {/* Response Context */}
                                                {post.responseToPostId && post.responseToPost && (
                                                    <div className="mb-4 pl-4 border-l-2 border-cyan-500/50">
                                                        <div className="text-sm text-gray-400 mb-1">
                                                            Replying to <span className="text-cyan-400">@{post.responseToPost.author?.displayName}</span>
                                                        </div>
                                                        <div className="text-sm text-gray-500 line-clamp-2 bg-black/20 p-2 rounded">
                                                            {post.responseToPost.content}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Author Header */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                                                            {post.author.avatarUrl ? (
                                                                <img src={post.author.avatarUrl} alt={post.author.displayName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                post.author.displayName[0]
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-gray-100">{post.author.displayName}</span>
                                                                <span className="text-gray-500 text-sm">@{post.author.handle}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                                                {post.topicTag && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="px-2 py-0.5 rounded-full bg-gray-800 border border-white/5 text-cyan-400">
                                                                            {post.topicTag}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Post Content */}
                                                <div className="mb-4 text-gray-200 whitespace-pre-wrap leading-relaxed">
                                                    {post.content}
                                                </div>

                                                {post.mediaUrl && (
                                                    <div className="mb-4 rounded-lg overflow-hidden bg-black/50 border border-white/5">
                                                        {post.mediaType === 'video' ? (
                                                            <video src={post.mediaUrl} controls className="w-full max-h-[500px] object-contain" />
                                                        ) : (
                                                            <img src={post.mediaUrl} alt="Post media" className="w-full max-h-[500px] object-contain" />
                                                        )}
                                                    </div>
                                                )}

                                                {/* Actions Bar */}
                                                <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                                                    <div className="flex items-center gap-6">
                                                        {/* Views Button */}
                                                        <div className="flex items-center gap-2 text-gray-400 group cursor-default">
                                                            <div className="p-2">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </div>
                                                            <span className="text-sm font-medium">{post.reachAll || 0}</span>
                                                        </div>

                                                        {/* Like Button */}
                                                        <motion.button
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleReaction(post)}
                                                            className={`flex items-center gap-2 transition-colors group ${post.reacted ? 'text-cyan-400' : 'text-gray-400 hover:text-cyan-400'}`}
                                                        >
                                                            <div className={`p-2 rounded-full group-hover:bg-cyan-500/10 transition-colors ${post.reacted ? 'bg-cyan-500/10' : ''}`}>
                                                                <motion.div
                                                                    animate={post.reacted ? { scale: [1, 1.25, 1] } : {}}
                                                                    transition={{ duration: 0.18 }}
                                                                >
                                                                    <PulseIcon
                                                                        active={post.reacted}
                                                                        filled={post.reacted}
                                                                        className="w-5 h-5"
                                                                    />
                                                                </motion.div>
                                                            </div>
                                                            <span className="text-sm font-medium">{post.reactionCount || 0}</span>
                                                        </motion.button>

                                                        {/* Reply Button */}
                                                        <button
                                                            onClick={() => {
                                                                setReplyingToPost(post);
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }}
                                                            className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors group"
                                                        >
                                                            <div className="p-2 rounded-full group-hover:bg-cyan-500/10 transition-colors">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                                </svg>
                                                            </div>
                                                            <span className="text-sm font-medium">Reply</span>
                                                        </button>
                                                    </div>

                                                    {/* Share Button */}
                                                    <motion.button
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleShare(post)}
                                                        className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                                                    >
                                                        <SplineShareIcon className="w-5 h-5" />
                                                    </motion.button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <RightSidebar />
                <MobileNav />
            </div>
        </div>
    );
}
