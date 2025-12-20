'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserMenu } from '@/components/UserMenu';
import { useNotificationStore } from '@/lib/notification-store';
import { useRouter } from 'next/navigation';

interface FeedHeaderProps {
  // Custom search behavior for specific pages
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}

export const FeedHeader: React.FC<FeedHeaderProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search V...',
}) => {
  const router = useRouter();
  // Directly count unread notifications for better reactivity
  const unreadCount = useNotificationStore((state) => state.notifications.filter(n => !n.read).length);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');

  // Use external search value if provided, otherwise use internal state
  const searchQuery = searchValue !== undefined ? searchValue : internalSearchQuery;
  const setSearchQuery = onSearchChange || setInternalSearchQuery;

  // Sync internal state with external value when it changes
  useEffect(() => {
    if (searchValue !== undefined) {
      setInternalSearchQuery(searchValue);
    }
  }, [searchValue]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // If custom search handler is provided, don't navigate
    if (onSearchChange) {
      return;
    }
    // Default behavior: navigate to search page
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/search');
    }
  };

  const handleSearchFocus = () => {
    // Only navigate to search page if no custom handler is provided
    if (!onSearchChange) {
      router.push('/search');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <header className="fixed top-0 left-0 lg:left-[72px] right-0 z-30 bg-gray-900/95 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center gap-4 px-4 lg:px-6 py-3">
        {/* Logo - Mobile only */}
        <div className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-xl font-bold flex-shrink-0">
          V
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              className="w-full bg-gray-800/50 border border-white/[0.06] rounded-lg px-4 py-2 pl-10 pr-10 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/30 transition-colors cursor-pointer"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Right Icons - Only Notifications and User Menu */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Notifications */}
          <motion.button
            onClick={() => router.push('/notifications')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {/* Notification badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-cyan-500 text-gray-900 text-[10px] font-bold rounded-full px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </motion.button>

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

