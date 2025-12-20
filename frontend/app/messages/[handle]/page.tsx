'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { messageAPI } from '@v/api-client';

function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

function formatDateSeparator(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }
}

function shouldShowDateSeparator(currentMsg: number, prevMsg?: number): boolean {
  if (!prevMsg) return true;

  const currentDate = new Date(currentMsg).toDateString();
  const prevDate = new Date(prevMsg).toDateString();

  return currentDate !== prevDate;
}

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams();
  const handle = params.handle as string;

  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Fetch conversation and messages
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Get current user ID (from mock or API)
        const { currentUserMock } = await import('@/lib/store');
        if (!currentUserMock?.id) return;
        setCurrentUserId(currentUserMock.id);

        // Find conversation by handle
        // Note: In a real app, we might need an endpoint to get conversation by handle
        // For now, we'll list conversations and find the one matching the handle
        const conversations = await messageAPI.listConversations({ userId: currentUserMock.id });
        const foundConv = conversations.find((c: any) => c.participantHandle === handle || c.participantId === handle);

        if (foundConv) {
          setConversation(foundConv);
          const msgs = await messageAPI.getMessages(foundConv.id);
          setMessages(msgs);
        } else {
          // If no conversation exists, we might need to fetch user info to start one
          // This part depends on backend implementation. For now, we'll just show not found if not in list
          // Or we could try to fetch user by handle and create a "temporary" conversation object
          try {
            const { userAPI } = await import('@v/api-client');
            const user = await userAPI.getByHandle(handle);
            if (user) {
              setConversation({
                id: 'new', // Placeholder ID
                participantId: user.id,
                participantName: user.name,
                participantHandle: user.handle,
                participantAvatar: user.avatarUrl,
                unreadCount: 0,
                isOnline: false,
              });
              setMessages([]);
            }
          } catch (e) {
            console.error('User not found:', e);
          }
        }
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [handle]);

  useEffect(() => {
    // Scroll to bottom on new messages
    scrollToBottom();
  }, [messages.length, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !conversation) return;

    try {
      const content = messageInput.trim();
      setMessageInput(''); // Clear immediately for better UX
      setShowEmojiPicker(false);

      // If it's a new conversation, we might need to create it first or just send message with target userId
      // The API client's sendMessage takes a conversationId. 
      // If we don't have a real conversation ID yet, we might need a different endpoint or logic.
      // Assuming for now we can send to conversation ID. If it's 'new', we might fail.
      // Let's assume the backend handles "send to user" or we need to create conversation.
      // For this refactor, let's assume we have a conversation ID or we can't send.

      if (conversation.id === 'new') {
        // TODO: Implement create conversation logic if needed
        // For now, we can't send if we don't have an ID, unless API supports sending to userId directly
        console.warn('Cannot send message to new conversation without ID');
        return;
      }

      await messageAPI.sendMessage(conversation.id, { senderId: currentUserId, content });

      // Refresh messages
      const msgs = await messageAPI.getMessages(conversation.id);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore input on error
      setMessageInput(messageInput);
    }
  };

  const quickEmojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '💯', '✨'];

  const handleEmojiClick = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Show loading state during SSR and initial mount
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Back to messages"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="h-4 w-32 bg-gray-800 rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
            <button className="w-9 h-9 flex items-center justify-center text-gray-400" aria-label="More options">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto pt-16 pb-20 px-4">
          <div className="max-w-4xl mx-auto py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 animate-pulse" />
            <div className="h-6 w-48 mx-auto bg-gray-800 rounded animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Back Button */}
          <button
            onClick={() => router.push('/messages')}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Back to messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Avatar & User Info */}
          {conversation ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-cyan-500/20">
                  <Image
                    src={conversation.participantAvatar}
                    alt={conversation.participantName}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                {conversation.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-white font-semibold truncate">{conversation.participantName}</h2>
                <p className="text-xs text-gray-400 truncate">
                  {conversation.isTyping ? (
                    <span className="text-cyan-400">typing...</span>
                  ) : (
                    conversation.isOnline ? 'Active now' : 'Offline'
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gray-800" />
              <div className="flex-1 min-w-0">
                <div className="h-4 w-32 bg-gray-800 rounded mb-2" />
                <div className="h-3 w-20 bg-gray-800 rounded" />
              </div>
            </div>
          )}

          {/* Menu Button */}
          <button
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
            aria-label="More options"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <main
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto pt-16 pb-20 px-4"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(20, 184, 166, 0.03) 0%, transparent 50%)',
        }}
      >
        <div className="max-w-4xl mx-auto py-4 space-y-4">
          {!conversation ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Conversation not found</h2>
              <button
                onClick={() => router.push('/messages')}
                className="text-cyan-400 hover:text-cyan-300"
              >
                Back to messages
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-400">No messages yet. Say hi! 👋</p>
            </div>
          ) : (
            conversation && messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : undefined;
              const showDate = shouldShowDateSeparator(message.timestamp, prevMessage?.timestamp);
              const isMyMessage = message.senderId === currentUserId;

              return (
                <React.Fragment key={message.id}>
                  {/* Date Separator */}
                  {showDate && (
                    <div className="flex items-center justify-center py-4">
                      <div className="px-4 py-1 bg-gray-800/50 rounded-full">
                        <span className="text-xs text-gray-400 font-medium">
                          {formatDateSeparator(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[70%] ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar (only for other user) */}
                      {!isMyMessage && (
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-cyan-500/20">
                          <Image
                            src={conversation.participantAvatar}
                            alt={conversation.participantName}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        </div>
                      )}

                      {/* Message Content */}
                      <div className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`px-4 py-2 rounded-2xl ${isMyMessage
                            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white'
                            : 'bg-gray-800 text-gray-100'
                            }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 px-1">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Bottom Composer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-white/[0.06] pb-safe">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            {/* Emoji Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Add emoji"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Emoji Picker */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 mb-2 p-3 bg-gray-800 border border-white/[0.06] rounded-xl shadow-xl"
                  >
                    <div className="grid grid-cols-4 gap-2">
                      {quickEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Text Input */}
            <div className="flex-1 bg-gray-800 rounded-full px-4 py-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Message..."
                className="w-full bg-transparent text-white placeholder-gray-500 text-sm"
                style={{
                  outline: 'none',
                  border: 'none',
                  boxShadow: 'none',
                  WebkitAppearance: 'none',
                }}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!messageInput.trim()}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${messageInput.trim()
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-400 hover:to-teal-400'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

