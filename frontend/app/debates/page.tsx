'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DebateCarousel, QuickStats, useDebateStore, useSignaling, LockExplainerModal } from '@/features/debates';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { LeftNav } from '@/components/feed/LeftNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { useNotificationStore } from '@/lib/notification-store';
import { useStore } from '@/lib/store';
import { useUserStore } from '@/features/users';
import { debateAPI } from '@v/api-client';
import { useAuth } from '@/features/auth';

export default function DebatesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [showCreateDebateModal, setShowCreateDebateModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [debates, setDebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeredDebates, setRegisteredDebates] = useState<Set<string>>(new Set());
  const [debateParticipants, setDebateParticipants] = useState<Record<string, number>>({});

  const {
    registerDebate,
    unregisterDebate,
    checkAndNotifyDebates
  } = useNotificationStore();

  const { isEnded } = useDebateStore();
  const { userPoints, fetchUserPoints } = useUserStore();
  const { currentUser, syncCurrentUser } = useStore();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // Sync current user when authenticated
  useEffect(() => {
    if (isAuthenticated && !currentUser && !authLoading) {
      console.log('[Debates Page] User authenticated but currentUser not set, syncing...');
      syncCurrentUser();
    }
  }, [isAuthenticated, currentUser, authLoading, syncCurrentUser]);

  // WebSocket connection for real-time debate updates
  const { isConnected: wsConnected, setOnMessage } = useSignaling(
    'debates-list', // Special room for debates list updates
    currentUser?.id || 'anonymous'
  );

  // Fetch debates and user points
  const loadData = useCallback(async () => {
    try {
      // Don't set loading to true here to avoid flickering on refresh
      // Only set it if it's the initial load
      if (debates.length === 0) setLoading(true);

      const [debatesData, _] = await Promise.all([
        debateAPI.list({ limit: 50 }),
        currentUser?.id ? fetchUserPoints(currentUser.id) : Promise.resolve()
      ]);

      if (debatesData) {
        // Fetch participant counts for all debates
        const debatesWithCounts = await Promise.all(
          debatesData.map(async (debate: any) => {
            try {
              const participants = await debateAPI.getParticipants(debate.id);
              return { ...debate, totalParticipants: participants.length };
            } catch (error) {
              return { ...debate, totalParticipants: 0 };
            }
          })
        );
        setDebates(debatesWithCounts);

        // Update participant counts in state
        debatesWithCounts.forEach((debate: any) => {
          setDebateParticipants(prev => ({
            ...prev,
            [debate.id]: debate.totalParticipants || 0,
          }));
        });
      }
    } catch (error) {
      console.error('Failed to load debates:', error);
      showToast('Failed to load debates', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, fetchUserPoints, showToast]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for real-time debate creation/updates via WebSocket
  useEffect(() => {
    const userId = currentUser?.id || 'anonymous';
    console.log('[Debates Page] Setting up WebSocket listener', {
      wsConnected,
      userId,
      roomId: 'debates-list',
    });

    setOnMessage((message: any) => {
      console.log('[Debates Page] Received WebSocket message:', message.type, message);

      if (message.type === 'debate:created') {
        console.log('[Debates Page] New debate created, refreshing list...', message.debate);
        // Refresh the debates list to include the new debate
        loadData();
      } else if (message.type === 'debate:status_changed') {
        console.log('[Debates Page] Debate status changed, refreshing list...', message);
        // Refresh when debate status changes (e.g., started, ended)
        loadData();
      }
    });

    return () => {
      console.log('[Debates Page] Cleaning up WebSocket listener');
      setOnMessage(() => { }); // Clear handler on unmount
    };
  }, [setOnMessage, loadData, currentUser?.id]);

  // Check if current user is Platinum
  const isPlatinumUser = userPoints?.tier === 'PLATINUM' || userPoints?.subscriptionActive === true;
  const canHostDebate = isPlatinumUser || (userPoints?.debatesHostedToday || 0) < 1;

  // Auto-refresh debates every minute and check for expired debates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const debatesData = await debateAPI.list({ limit: 50 });
        if (debatesData) {
          const now = new Date();

          // Auto-end debates that have passed their end time
          for (const debate of debatesData) {
            if (debate.endTime && new Date(debate.endTime) < now) {
              const status = debate.status?.toLowerCase();
              if (status === 'active' || status === 'live' || status === 'running') {
                // Debate has ended, update its status
                try {
                  await debateAPI.update(debate.id, { status: 'ENDED' });
                  console.log(`Auto-ended debate: ${debate.title}`);
                } catch (error) {
                  console.error(`Failed to auto-end debate ${debate.id}:`, error);
                }
              }
            }
          }

          // Refresh debates list after potential updates
          const updatedDebates = await debateAPI.list({ limit: 50 });
          setDebates(updatedDebates || debatesData);

          // Check and create notifications for debates starting soon or just started
          const runningIds = (updatedDebates || debatesData).filter((d: any) =>
            d.status?.toLowerCase() === 'live' || d.status?.toLowerCase() === 'active' || d.status?.toLowerCase() === 'running'
          ).map((d: any) => d.id);
          // Pass all debates with startTime for 5-minute reminder checks
          const allDebatesData = (updatedDebates || debatesData).map((d: any) => ({
            id: d.id,
            title: d.title,
            startTime: d.startTime,
          }));
          checkAndNotifyDebates(runningIds, allDebatesData);
        }
      } catch (error) {
        console.error('Failed to refresh debates:', error);
      }
    }, 30000); // Check every 30 seconds for more accurate 5-minute reminders

    return () => clearInterval(interval);
  }, [checkAndNotifyDebates]);

  // Also check for 5-minute reminders more frequently (every 30 seconds)
  useEffect(() => {
    const reminderInterval = setInterval(async () => {
      try {
        const debatesData = await debateAPI.list({ limit: 50 });
        if (debatesData) {
          const allDebatesData = debatesData.map((d: any) => ({
            id: d.id,
            title: d.title,
            startTime: d.startTime,
          }));
          checkAndNotifyDebates([], allDebatesData); // Pass empty array for runningIds, just check reminders
        }
      } catch (error) {
        // Silently fail for reminder checks
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(reminderInterval);
  }, [checkAndNotifyDebates]);

  // Filter debates
  const runningDebates = debates.filter(debate =>
    debate.status?.toLowerCase() === 'live' || debate.status?.toLowerCase() === 'active' || debate.status?.toLowerCase() === 'running'
  );

  const upcomingDebates = debates
    .filter(debate =>
      debate.status?.toLowerCase() === 'upcoming' || debate.status?.toLowerCase() === 'scheduled'
    )
    .map(debate => ({
      ...debate,
      totalParticipants: debateParticipants[debate.id] ?? debate.totalParticipants ?? debate.participants?.length ?? 0,
    }));

  const handleRegister = async (debateId: string) => {
    if (!currentUser?.id) {
      showToast('Please log in to register for debates', 'error');
      return;
    }

    if (!registeredDebates.has(debateId)) {
      try {
        await debateAPI.join(debateId, { userId: currentUser.id, side: 'agree' }); // Default to agree side for registration
        setRegisteredDebates(prev => new Set(prev).add(debateId));

        // Fetch updated participant count from API
        try {
          const participants = await debateAPI.getParticipants(debateId);
          setDebateParticipants(prev => ({
            ...prev,
            [debateId]: participants.length,
          }));
        } catch (error) {
          // Fallback to incrementing if API call fails
          const baseDebate = debates.find(d => d.id === debateId);
          const currentCount = debateParticipants[debateId] ?? baseDebate?.totalParticipants ?? 0;
          setDebateParticipants(prev => ({
            ...prev,
            [debateId]: currentCount + 1,
          }));
        }

        // Register for notifications
        const baseDebate = debates.find(d => d.id === debateId);
        if (baseDebate) {
          registerDebate(debateId, baseDebate.title);
          showToast(`Registered for ${baseDebate.title}`, 'success');
        }
      } catch (error: any) {
        if (error.message?.includes('already participating')) {
          setRegisteredDebates(prev => new Set(prev).add(debateId));
          showToast('You are already registered for this debate', 'info');
        } else {
          console.error('Failed to register:', error);
          showToast('Failed to register', 'error');
        }
      }
    }
  };

  const handleUnregister = async (debateId: string) => {
    if (!currentUser?.id) {
      showToast('Please log in', 'error');
      return;
    }

    if (registeredDebates.has(debateId)) {
      try {
        await debateAPI.leave(debateId, currentUser.id);
        setRegisteredDebates(prev => {
          const newSet = new Set(prev);
          newSet.delete(debateId);
          return newSet;
        });

        // Fetch updated participant count from API
        try {
          const participants = await debateAPI.getParticipants(debateId);
          setDebateParticipants(prev => ({
            ...prev,
            [debateId]: participants.length,
          }));
        } catch (error) {
          // Fallback to decrementing if API call fails
          const baseDebate = debates.find(d => d.id === debateId);
          const currentCount = debateParticipants[debateId] ?? baseDebate?.totalParticipants ?? 0;
          setDebateParticipants(prev => ({
            ...prev,
            [debateId]: Math.max(0, currentCount - 1),
          }));
        }

        // Unregister from notifications
        unregisterDebate(debateId);
        showToast('Unregistered from debate', 'success');
      } catch (error) {
        console.error('Failed to unregister from debate:', error);
        showToast('Failed to unregister from debate', 'error');
      }
    }
  };

  const handleDeleteDebate = async (debateId: string) => {
    try {
      await debateAPI.delete(debateId);
      showToast('Debate deleted successfully', 'success');
      loadData(); // Refresh debates after deletion
    } catch (error) {
      console.error('Failed to delete debate:', error);
      showToast('Failed to delete debate', 'error');
    }
  };

  const handleCreateDebate = () => {
    // Soft-lock Phase 1: Prevent creation and show explainer
    setShowLockModal(true);
    return;

    /* 
    // Original Logic preserved for Phase 2
    if (!currentUser?.id) {
      showToast('Please log in to create a debate', 'error');
      router.push('/login?next=/debates');
      return;
    }
    if (!canHostDebate) {
       // ... existing logic ...
       return;
    }
    router.push('/debates/create');
    */
  };

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

          {/* Right Sidebar - Desktop Only - Fixed Position */}
          <div className="hidden xl:block fixed right-6 top-20 w-[340px] z-20">
            <QuickStats />
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pt-16">
            <div className="max-w-full px-4 sm:px-6 py-6 sm:py-8 lg:ml-16 xl:pr-[380px]">
              <h1 className="text-2xl sm:text-3xl font-bold mb-5 sm:mb-6 text-gray-100">
                Debate Rooms
              </h1>

              {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* Running Debates */}
                  {runningDebates.length > 0 ? (
                    <DebateCarousel debates={runningDebates} title="Running Debates" onDelete={handleDeleteDebate} />
                  ) : (
                    <div className="mb-10">
                      <h2 className="text-xl font-semibold mb-5 text-gray-100">Running Debates</h2>
                      <div className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-12 text-center">
                        <p className="text-gray-400">No running debates</p>
                      </div>
                    </div>
                  )}

                  {/* Upcoming Debates */}
                  {upcomingDebates.length > 0 ? (
                    <DebateCarousel
                      debates={upcomingDebates}
                      title="Upcoming Debates"
                      onRegister={handleRegister}
                      onUnregister={handleUnregister}
                      onDelete={handleDeleteDebate}
                      registeredDebates={registeredDebates}
                    />
                  ) : (
                    <div className="mb-10">
                      <h2 className="text-xl font-semibold mb-5 text-gray-100">Upcoming Debates</h2>
                      <div className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-12 text-center">
                        <p className="text-gray-400">No upcoming debates</p>
                      </div>
                    </div>
                  )}

                  {/* Stats Link */}
                  <div className="mb-6">
                    <Link href="/debates/stats">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700 hover:border-gray-600 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        View Topic Statistics
                      </motion.button>
                    </Link>
                  </div>

                  {/* Create Debate Button */}
                  <div className="mb-20">
                    <div className="relative group inline-block">
                      <motion.button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!canHostDebate) {
                            if (!isPlatinumUser) {
                              showToast('You have reached your daily debate hosting limit. Upgrade to Platinum for unlimited hosting.', 'info');
                            } else {
                              showToast('Unable to create debate', 'error');
                            }
                            return;
                          }
                          handleCreateDebate();
                        }}
                        whileHover={canHostDebate ? { scale: 1.02 } : {}}
                        whileTap={canHostDebate ? { scale: 0.98 } : {}}
                        disabled={!canHostDebate}
                        className={`
                          px-6 py-3 rounded-xl font-semibold text-sm
                          transition-all duration-200 flex items-center gap-2
                          ${canHostDebate
                            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-gray-900 shadow-lg shadow-cyan-500/20 cursor-pointer'
                            : 'bg-[#0F1621] text-gray-500 cursor-not-allowed opacity-60 border border-gray-700/50'
                          }
                        `}
                        style={{
                          pointerEvents: canHostDebate ? 'auto' : 'none',
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Debate
                      </motion.button>

                      {/* Tooltip for users who can't host */}
                      {!canHostDebate && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          <div className="bg-gray-900 text-gray-200 text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-white/10">
                            <div className="flex items-center gap-2">
                              {!isPlatinumUser ? (
                                <>
                                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  <span>Platinum required or daily limit reached</span>
                                </>
                              ) : (
                                <span>Daily limit reached</span>
                              )}
                            </div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 border-r border-b border-white/10"></div>
                          </div>
                        </div>
                      )}

                      {/* Show hosting status */}
                      {userPoints && !isPlatinumUser && (
                        <div className="mt-2 text-xs text-gray-500 text-center">
                          Debates hosted today: {userPoints.debatesHostedToday}/1
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-t border-white/[0.06] pb-safe">
        <div className="flex items-center justify-around px-1 sm:px-2 py-2 min-w-0">
          {/* Feed */}
          <Link href="/feed" className="flex-1 min-w-0 flex justify-center">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-2 relative w-full max-w-[80px]"
            >
              <div className={`${pathname === '/feed' ? 'text-cyan-400' : 'text-gray-400'} flex-shrink-0`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <span className={`text-[10px] sm:text-xs font-medium ${pathname === '/feed' ? 'text-cyan-400' : 'text-gray-400'} truncate w-full text-center`}>
                Feed
              </span>
              {pathname === '/feed' && (
                <motion.div
                  layoutId="activeMobileNav"
                  className="absolute top-0 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.div>
          </Link>

          {/* Messages */}
          <Link href="/messages" className="flex-1 min-w-0 flex justify-center">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-2 relative w-full max-w-[80px]"
            >
              <div className={`${pathname === '/messages' || pathname?.startsWith('/messages/') ? 'text-cyan-400' : 'text-gray-400'} flex-shrink-0`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className={`text-[10px] sm:text-xs font-medium ${pathname === '/messages' || pathname?.startsWith('/messages/') ? 'text-cyan-400' : 'text-gray-400'} truncate w-full text-center`}>
                Messages
              </span>
              {(pathname === '/messages' || pathname?.startsWith('/messages/')) && (
                <motion.div
                  layoutId="activeMobileNav"
                  className="absolute top-0 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.div>
          </Link>

          {/* Debates */}
          <Link href="/debates" className="flex-1 min-w-0 flex justify-center">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-2 relative w-full max-w-[80px]"
            >
              <div className={`${pathname === '/debates' ? 'text-cyan-400' : 'text-gray-400'} flex-shrink-0`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className={`text-[10px] sm:text-xs font-medium ${pathname === '/debates' ? 'text-cyan-400' : 'text-gray-400'} truncate w-full text-center`}>
                Debates
              </span>
              {pathname === '/debates' && (
                <motion.div
                  layoutId="activeMobileNav"
                  className="absolute top-0 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.div>
          </Link>

          {/* Hashtag */}
          <Link href="/hashtag" className="flex-1 min-w-0 flex justify-center">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-2 relative w-full max-w-[80px]"
            >
              <div className={`${pathname === '/hashtag' || pathname?.startsWith('/hashtag/') ? 'text-cyan-400' : 'text-gray-400'} flex-shrink-0`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <span className={`text-[10px] sm:text-xs font-medium ${pathname === '/hashtag' || pathname?.startsWith('/hashtag/') ? 'text-cyan-400' : 'text-gray-400'} truncate w-full text-center`}>
                Hashtag
              </span>
              {(pathname === '/hashtag' || pathname?.startsWith('/hashtag/')) && (
                <motion.div
                  layoutId="activeMobileNav"
                  className="absolute top-0 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.div>
          </Link>

          {/* Profile */}
          <Link href={`/u/${currentUser?.handle || 'profile'}`} className="flex-1 min-w-0 flex justify-center" suppressHydrationWarning>
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-2 relative w-full max-w-[80px]"
            >
              <div className={`${pathname?.startsWith('/u/') ? 'text-cyan-400' : 'text-gray-400'} flex-shrink-0`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className={`text-[10px] sm:text-xs font-medium ${pathname?.startsWith('/u/') ? 'text-cyan-400' : 'text-gray-400'} truncate w-full text-center`}>
                Profile
              </span>
              {pathname?.startsWith('/u/') && (
                <motion.div
                  layoutId="activeMobileNav"
                  className="absolute top-0 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.div>
          </Link>
        </div>
      </nav>

      {/* Mobile FAB for Create Debate */}
      <div className="lg:hidden fixed bottom-20 right-6 z-20">
        <div className="relative group">
          <motion.button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!canHostDebate) {
                if (!isPlatinumUser) {
                  showToast('You have reached your daily debate hosting limit. Upgrade to Platinum for unlimited hosting.', 'info');
                } else {
                  showToast('Unable to create debate', 'error');
                }
                return;
              }
              handleCreateDebate();
            }}
            whileHover={canHostDebate ? { scale: 1.1 } : {}}
            whileTap={canHostDebate ? { scale: 0.9 } : {}}
            disabled={!canHostDebate}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center
              ${canHostDebate
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 shadow-xl shadow-cyan-500/30 cursor-pointer'
                : 'bg-[#0F1621] text-gray-500 cursor-not-allowed opacity-60 border border-gray-700/50 pointer-events-none'
              }
            `}
            style={{
              pointerEvents: canHostDebate ? 'auto' : 'none',
            }}
          >
            <svg className={`w-6 h-6 ${canHostDebate ? 'text-gray-900' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </motion.button>
        </div>
      </div>
      <LockExplainerModal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        unlockPhase={2}
      />
    </div>
  );
}
