'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Composer } from '@/features/posts';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';

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

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { addPost, currentUser } = useStore();
  const { addToast } = useToast();

  // Start with default handle to match server-side rendering
  const [handle, setHandle] = useState('you');

  React.useEffect(() => {
    if (currentUser?.handle) {
      setHandle(currentUser.handle);
    }
  }, [currentUser?.handle]);

  const navItems = getNavItems(handle);
  const [showComposer, setShowComposer] = useState(false);

  const handlePost = async (content: string, media?: { type: 'image' | 'video'; file: File }, options?: { commentsDisabled?: boolean; commentLimit?: number }) => {
    // Create URL for media preview (UI-only, not uploaded anywhere)
    const mediaData = media ? {
      type: media.type,
      url: URL.createObjectURL(media.file),
    } : undefined;

    await addPost(content, mediaData, options);
    addToast('Posted', 'success');
    setShowComposer(false);

    // Scroll to top to show the new post (on mobile)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-t border-white/[0.06] pb-safe">
        <div className="flex items-center justify-around px-1 sm:px-2 py-2 min-w-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/messages' && pathname?.startsWith('/messages'));
            return (
              <Link key={item.id} href={item.href} className="flex-1 min-w-0 flex justify-center">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-2 relative w-full max-w-[80px]"
                >
                  <div className={`${isActive ? 'text-cyan-400' : 'text-gray-400'} flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <span className={`text-[10px] sm:text-xs font-medium ${isActive ? 'text-cyan-400' : 'text-gray-400'} truncate w-full text-center`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeMobileNav"
                      className="absolute top-0 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowComposer(true)}
        className="lg:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center"
        aria-label="Create post"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </motion.button>

      {/* Composer Modal */}
      <AnimatePresence>
        {showComposer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComposer(false)}
              className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Create Post</h2>
                  <button
                    onClick={() => setShowComposer(false)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                {/* Composer */}
                <Composer onPost={handlePost} isMobile />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

