'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { logout } from '@/lib/auth';
import { useStore } from '@/lib/store';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

const getNavItems = (handle: string): NavItem[] => [
  {
    id: 'feed',
    label: 'Feed',
    href: '/feed',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'messages',
    label: 'Messages',
    href: '/messages',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'debates',
    label: 'Debates',
    href: '/debates',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'hashtag',
    label: 'Hashtag',
    href: '/hashtag',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    href: `/u/${handle}`,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export const LeftNav: React.FC = () => {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { currentUser } = useStore();
  // Start with default handle to match server-side rendering
  const [handle, setHandle] = useState('you');

  useEffect(() => {
    if (currentUser?.handle) {
      setHandle(currentUser.handle);
    } else {
      // Reset to default if user is not available
      setHandle('you');
    }
  }, [currentUser]);

  const navItems = getNavItems(handle);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Desktop Left Nav */}
      <motion.nav
        initial={false}
        animate={{ width: expanded ? 240 : 72 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className="hidden lg:flex flex-col h-full bg-gray-900/40 backdrop-blur-sm border-r border-white/[0.06] fixed left-0 top-0 z-40"
      >
        <div className="flex flex-col h-full py-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 mb-6 text-white">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-xl font-bold flex-shrink-0">
              V
            </div>
          </div>

          {/* Nav Items */}
          <div className="flex-1 space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.id} href={item.href}>
                  <motion.div
                    whileHover={{ x: 2 }}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isActive
                      ? 'text-cyan-400 bg-cyan-500/10'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                      }`}
                  >
                    {/* Active indicator rail */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-cyan-400 to-teal-400 rounded-r-full"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}

                    <div className="flex-shrink-0">{item.icon}</div>

                    {expanded && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.05 }}
                        className="font-medium text-sm whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* Logout Button */}
          <div className="px-2 mt-auto mb-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`w-full flex items-center gap-2 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${expanded ? 'justify-start px-4' : 'justify-center px-3'
                }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 }}
                  className="whitespace-nowrap text-sm font-semibold"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.nav>
    </>
  );
};

