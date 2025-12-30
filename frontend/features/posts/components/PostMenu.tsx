'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';

interface PostMenuProps {
    postId: string;
    authorId: string;
}

export const PostMenu: React.FC<PostMenuProps> = ({ postId, authorId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { currentUser } = useStore();

    const isAuthor = currentUser?.id === authorId;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleCopyLink = () => {
        const url = `${window.location.origin}/post/${postId}`;
        navigator.clipboard.writeText(url);
        setIsOpen(false);
        // Could add toast here
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-full transition-colors"
                aria-label="More options"
            >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="4" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="10" cy="16" r="1.5" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/[0.06] rounded-xl shadow-xl overflow-hidden z-50 flex flex-col"
                    >
                        {isAuthor && (
                            <Link
                                href={`/post/${postId}/analytics`}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors"
                                role="menuitem"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                View Analytics
                            </Link>
                        )}

                        <button
                            onClick={handleCopyLink}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors w-full text-left"
                            role="menuitem"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Link
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
