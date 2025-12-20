'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { messageAPI } from '@v/api-client';
import { currentUserMock } from '@/lib/store';
import { LeftNav } from '@/components/feed/LeftNav';
import { MobileNav } from '@/components/feed/MobileNav';

function formatMessageTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return `${weeks}w`;
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        const data = currentUserMock?.id ? await messageAPI.listConversations({ userId: currentUserMock.id }) : [];
        if (data) {
          setConversations(data);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="flex h-screen overflow-hidden">
        <LeftNav />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="fixed top-0 left-0 lg:left-[72px] right-0 z-30 bg-gray-900/95 backdrop-blur-xl border-b border-white/[0.06]">
            <div className="flex items-center gap-4 px-4 lg:px-6 py-3">
              {/* Logo - Mobile only */}
              <div className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-xl font-bold flex-shrink-0">
                V
              </div>

              <h1 className="text-xl font-bold text-white">Messages</h1>

              {/* Compose New Message Button */}
              <button
                className="ml-auto w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
                aria-label="New message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </header>

          {/* Conversations List */}
          <main className="flex-1 overflow-y-auto pt-16 lg:ml-[72px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-20 h-20 mb-6 rounded-full bg-gray-800/50 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No messages yet</h2>
                <p className="text-gray-400">Start a conversation with someone</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {conversations.map((conversation) => (
                  <motion.div
                    key={conversation.id}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                    onClick={() => router.push(`/messages/${conversation.participantHandle || conversation.participantId}`)}
                    className="flex items-center gap-4 px-4 lg:px-6 py-4 cursor-pointer transition-colors"
                  >
                    {/* Avatar with online indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-cyan-500/20">
                        <Image
                          src={conversation.participantAvatar || `https://ui-avatars.com/api/?name=${conversation.participantName}`}
                          alt={conversation.participantName}
                          width={56}
                          height={56}
                          className="object-cover"
                        />
                      </div>
                      {conversation.isOnline && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-gray-950 rounded-full" />
                      )}
                    </div>

                    {/* Message info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <h3 className="text-white font-semibold truncate">
                          {conversation.participantName}
                        </h3>
                        {conversation.lastMessageTime && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatMessageTime(conversation.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-400'
                          }`}>
                          {conversation.isTyping ? (
                            <span className="text-cyan-400 italic">typing...</span>
                          ) : (
                            conversation.lastMessage || 'No messages yet'
                          )}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <div className="flex-shrink-0 min-w-[20px] h-5 px-2 bg-cyan-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}

