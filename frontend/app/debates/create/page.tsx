'use client';

import { CreateDebateForm } from '@/features/debates';
import { LeftNav } from '@/components/feed/LeftNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useAuth } from '@/features/auth';
import { useEffect } from 'react';

export default function CreateDebatePage() {
    const router = useRouter();
    const { currentUser, syncCurrentUser } = useStore();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // Sync current user when authenticated
    useEffect(() => {
        if (isAuthenticated && !currentUser && !authLoading) {
            console.log('[Create Debate Page] User authenticated but currentUser not set, syncing...');
            syncCurrentUser();
        }
    }, [isAuthenticated, currentUser, authLoading, syncCurrentUser]);

    return (
        <div className="min-h-screen bg-[#0C1117] text-gray-100">
            {/* Main Layout */}
            <div className="flex h-screen overflow-hidden">
                {/* Left Navigation */}
                <LeftNav />

                {/* Center Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <FeedHeader />

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto pt-16">
                        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                            {/* Back Button */}
                            <button
                                onClick={() => router.back()}
                                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to Debates
                            </button>

                            {/* Page Title */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h1 className="text-3xl font-bold mb-2 text-gray-100">
                                    Create Debate
                                </h1>
                                <p className="text-gray-400 mb-8">
                                    Set up a new debate room for your community
                                </p>

                                {/* Form Card */}
                                <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl shadow-xl p-6">
                                    <CreateDebateForm
                                        onClose={() => router.back()}
                                    />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
