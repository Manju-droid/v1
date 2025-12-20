'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useNotificationStore } from '@/lib/notification-store';
import { LeftNav } from '@/components/feed/LeftNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { formatRelativeTime } from '@v/shared';

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    isLoading
  } = useNotificationStore();

  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch notifications on mount and periodically
  useEffect(() => {
    // Fetch immediately when page loads
    console.log('[Notifications Page] Component mounted, fetching notifications...');
    fetchNotifications().catch((error) => {
      console.error('[Notifications Page] Error fetching notifications:', error);
    });
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(() => {
      console.log('[Notifications Page] Periodic refresh, fetching notifications...');
      fetchNotifications().catch((error) => {
        console.error('[Notifications Page] Error in periodic fetch:', error);
      });
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);
  
  // Log notifications for debugging
  useEffect(() => {
    console.log('[Notifications Page] Current notifications:', notifications);
    console.log('[Notifications Page] Loading state:', isLoading);
  }, [notifications, isLoading]);

  const handleNotificationClick = (notificationId: string, debateId?: string, postId?: string) => {
    markAsRead(notificationId);
    if (debateId) {
      router.push(`/debates/${debateId}`);
    } else if (postId) {
      router.push(`/post/${postId}`);
    }
  };

  const handleRefresh = () => {
    fetchNotifications();
  };

  return (
    <div className="min-h-screen bg-[#0C1117] text-gray-100">
      <div className="flex h-screen overflow-hidden">
        {/* Left Navigation */}
        <LeftNav />

        {/* Center Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <FeedHeader />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pt-16">
            <div className="max-w-[720px] mx-auto px-6 py-8 lg:ml-16">
              {/* Page Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-100">Notifications</h1>
                  {unreadCount > 0 && (
                    <p className="text-sm text-gray-400 mt-1">
                      {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <motion.button
                    onClick={handleRefresh}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm rounded-lg bg-gray-800/50 hover:bg-gray-800 text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg
                      className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh
                  </motion.button>
                  {notifications.length > 0 && (
                    <>
                      {unreadCount > 0 && (
                        <motion.button
                          onClick={markAllAsRead}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="px-4 py-2 text-sm rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors"
                        >
                          Mark all read
                        </motion.button>
                      )}
                      <motion.button
                        onClick={clearAll}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 text-sm rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        Clear all
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              {isLoading && notifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-12 text-center"
                >
                  <div className="flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-cyan-400 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">Loading notifications...</h3>
                  <p className="text-gray-500">Fetching your notifications</p>
                </motion.div>
              ) : notifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-12 text-center"
                >
                  <svg
                    className="w-16 h-16 text-gray-600 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No notifications yet</h3>
                  <p className="text-gray-500">We'll notify you when something important happens</p>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {notifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleNotificationClick(notification.id, notification.debateId || undefined, notification.postId || undefined)}
                        className={`group relative bg-[#1F2937] border rounded-xl p-4 transition-all cursor-pointer ${notification.read
                            ? 'border-white/[0.08] hover:border-white/[0.12]'
                            : 'border-cyan-500/30 hover:border-cyan-500/50 bg-cyan-500/5'
                          }`}
                      >
                        {/* Unread Indicator */}
                        {!notification.read && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-500 rounded-full" />
                        )}

                        <div className="flex items-start gap-4 pl-4">
                          {/* Icon */}
                          <div className={`mt-1 flex-shrink-0 ${notification.type === 'debate_starting' || notification.type === 'debate_reminder' ? 'text-cyan-400' :
                              notification.type === 'follow' ? 'text-purple-400' :
                                notification.type === 'reaction' ? 'text-yellow-400' :
                                  notification.type === 'comment' ? 'text-green-400' :
                                    notification.type === 'mention' ? 'text-orange-400' :
                                      'text-purple-400'
                            }`}>
                            {notification.type === 'debate_starting' || notification.type === 'debate_reminder' ? (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                            ) : notification.type === 'follow' ? (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            ) : notification.type === 'reaction' ? (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                />
                              </svg>
                            ) : notification.type === 'comment' ? (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                                />
                              </svg>
                            ) : notification.type === 'mention' ? (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                                />
                              </svg>
                            ) : (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                />
                              </svg>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-100 mb-1">
                              {notification.title}
                            </h3>
                            <p className="text-sm text-gray-400 mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatRelativeTime(new Date(notification.createdAt))}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.read && (
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                                title="Mark as read"
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </motion.button>
                            )}
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

