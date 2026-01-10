'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';
import { useStore } from '@/lib/store';

interface PendingRequestsSidebarProps {
    communityId: string;
}

export const PendingRequestsSidebar: React.FC<PendingRequestsSidebarProps> = ({ communityId }) => {
    const [pendingMembers, setPendingMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const getCookie = (name: string) => {
        if (typeof document === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    };

    const fetchPendingMembers = async () => {
        try {
            console.log('Fetching pending members for:', communityId);
            const res = await fetch(`http://localhost:8080/api/communities/${communityId}/members?status=pending`);
            console.log('Fetch response status:', res.status);
            if (res.ok) {
                const data = await res.json();
                console.log('Pending members data:', data);
                // data will be []EnrichedMember { CommunityMember, User }
                setPendingMembers(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch pending members:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingMembers();

        // Poll for updates every 5 seconds
        const intervalId = setInterval(() => {
            fetchPendingMembers();
        }, 5000);

        return () => clearInterval(intervalId);
    }, [communityId]);

    const handleAccept = async (userId: string) => {
        try {
            const token = getCookie('v_auth') || localStorage.getItem('auth_token');
            const res = await fetch(`http://localhost:8080/api/communities/${communityId}/members/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'active' })
            });

            if (res.ok) {
                setPendingMembers(prev => prev.filter(m => m.userId !== userId));
            } else {
                alert('Failed to accept user');
            }
        } catch (err) {
            console.error(err);
            alert('Error accepting user');
        }
    };

    const handleDecline = async (userId: string) => {
        if (!confirm('Are you sure you want to decline this request?')) return;

        try {
            const token = getCookie('v_auth') || localStorage.getItem('auth_token');
            const res = await fetch(`http://localhost:8080/api/communities/${communityId}/members/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setPendingMembers(prev => prev.filter(m => m.userId !== userId));
            } else {
                alert('Failed to decline user');
            }
        } catch (err) {
            console.error(err);
            alert('Error declining user');
        }
    };

    if (loading) {
        return (
            <aside className="hidden xl:block w-[340px] h-full fixed right-0 top-16 overflow-y-auto py-6 px-4 space-y-6">
                <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 h-64 animate-pulse" />
            </aside>
        );
    }

    return (
        <aside className="hidden xl:block w-[340px] h-full fixed right-0 top-16 overflow-y-auto py-6 px-4 space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Pending Requests</h2>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full">{pendingMembers.length}</span>
                </div>

                <div className="space-y-3">
                    {pendingMembers.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-400">No pending requests</p>
                        </div>
                    ) : (
                        pendingMembers.map((member) => (
                            <motion.div
                                key={member.userId}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="bg-black/20 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <Link href={`/u/${member.user?.handle}`} className="shrink-0">
                                        <Avatar user={member.user} size="40px" />
                                    </Link>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-bold text-white truncate">{member.user?.name}</h3>
                                        <p className="text-xs text-gray-400 truncate">@{member.user?.handle}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAccept(member.userId)}
                                        className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold py-1.5 rounded transition-colors border border-cyan-500/20"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleDecline(member.userId)}
                                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold py-1.5 rounded transition-colors border border-red-500/20"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>

            {/* Helpful Info Card for Admins */}
            <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-2">Admin Tips</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                    Only you can see this panel. Accepting a user gives them full member access.
                    Declining removes their request permanently.
                </p>
            </div>
        </aside>
    );
};
