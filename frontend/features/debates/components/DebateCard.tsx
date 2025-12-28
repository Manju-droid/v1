'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Debate, getTimeRemaining, getStartTime } from '@/lib/mock-debates';
import { useToast } from '@/hooks/useToast';
import { useNotificationStore } from '@/lib/notification-store';
import { useDebateRoomStore, JoinDebateModal } from '@/features/debates';
import { LockExplainerModal } from './LockExplainerModal';
import { currentUserMock, useStore } from '@/lib/store';
import { userAPI } from '@v/api-client';

interface DebateCardProps {
  debate: Debate;
  index: number;
  onRegister?: (debateId: string) => void;
  onUnregister?: (debateId: string) => void;
  onDelete?: (debateId: string) => void; // Added onDelete prop
  isRegistered?: boolean;
}

export const DebateCard: React.FC<DebateCardProps> = ({ debate, index, onRegister, onUnregister, onDelete, isRegistered = false }) => {
  const router = useRouter();
  const { showToast } = useToast();
  const { addReminder } = useNotificationStore();
  const { joinRoom } = useDebateRoomStore();
  const { currentUser } = useStore(); // Get current user from store
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [hostInfo, setHostInfo] = useState<{ displayName?: string; handle?: string; avatar?: string } | null>(null);

  // Fetch host info if not available in debate object
  useEffect(() => {
    // Debug: Log what we have
    console.log('[DebateCard] Debate host data:', {
      hasHost: !!debate.host,
      host: debate.host,
      hostId: debate.hostId,
    });

    const fetchHostInfo = async () => {
      // If host exists in debate object, use it and set hostInfo
      if (debate.host) {
        console.log('[DebateCard] Using debate.host:', debate.host);
        setHostInfo({
          displayName: debate.host.displayName || (debate.host as any).name || (debate.host as any).Name || debate.host.handle,
          handle: debate.host.handle || (debate.host as any).Handle,
          avatar: debate.host.avatar || (debate.host as any).avatarUrl || (debate.host as any).AvatarURL,
        });
      } else if (debate.hostId) {
        // Fallback: fetch host info if not in debate object
        try {
          const user = await userAPI.getById(debate.hostId);
          console.log('[DebateCard] Fetched host user:', user);
          if (user) {
            setHostInfo({
              displayName: user.displayName || (user as any).name || user.handle,
              handle: user.handle,
              avatar: (user as any).avatarUrl || user.avatar,
            });
          }
        } catch (error) {
          // Silently fail - we'll show fallback
          console.log('Could not fetch host info:', error);
        }
      }
    };
    fetchHostInfo();
  }, [debate.host, debate.hostId]);

  // Check if debate is running based on status and time
  const now = Date.now();
  const startTime = new Date(debate.startTime).getTime();
  const endTime = debate.endTime ? new Date(debate.endTime).getTime() : Infinity;
  const isTimeRunning = startTime <= now && now < endTime;
  const isRunning = isTimeRunning && (
    debate.status?.toLowerCase() === 'active' ||
    debate.status?.toLowerCase() === 'live' ||
    debate.status?.toLowerCase() === 'running'
  );

  const isHost = currentUser?.id && (debate.host?.id === currentUser.id || debate.hostId === currentUser.id); // Check if current user is host

  // Phase 1 Global Lock: Treat undefined isLocked as TRUE
  const isLocked = debate.isLocked !== false;

  const handleJoin = () => {
    if (!isRunning) {
      showToast('This debate hasn\'t started yet', 'info');
      return;
    }

    if (isLocked) {
      setShowLockModal(true);
      return;
    }

    // Open the side selection modal
    setShowJoinModal(true);
  };

  const handleSelectSide = (side: 'agree' | 'disagree') => {
    // Close modal
    setShowJoinModal(false);

    // Join the room with selected side
    const userId = currentUser?.id || currentUserMock?.id || '';
    if (!userId) return;
    joinRoom(debate.id, side, userId); // Use currentUser.id if available

    // Navigate to debate room
    router.push(`/debates/${debate.id}`);
  };

  const timeText = isRunning && debate.endTime
    ? getTimeRemaining(debate.endTime)
    : getStartTime(debate.startTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-[#1F2937] border border-white/[0.08] rounded-xl p-4 sm:p-5 hover:border-cyan-500/40 transition-all duration-300 group h-full flex flex-col relative" // Added relative
      onClick={() => {
        if (isLocked) {
          setShowLockModal(true);
          return;
        }
        // If scheduled, go to waiting screen
        if (!isRunning) {
          router.push(`/debates/${debate.id}`);
        }
      }}
    >
      {/* Lock Overlay/Badge */}
      {isLocked && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 px-2 py-1 rounded-full">
            <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">Coming Soon</span>
          </div>
        </div>
      )}
      {/* Delete Button for Host */}
      {isHost && !isRunning && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this debate? This action cannot be undone.')) {
              onDelete?.(debate.id);
            }
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors z-20"
          title="Delete Debate"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* Title - Fixed height */}
      <h3 className="text-base sm:text-lg font-semibold text-gray-100 mb-3 h-12 sm:h-14 line-clamp-2 leading-snug pr-6"> {/* Added pr-6 */}
        {debate.title}
      </h3>


      {/* Host info - Fixed height */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4 h-5 sm:h-6">
        {(debate.host?.avatar || hostInfo?.avatar) ? (
          <>
            <Image
              src={debate.host?.avatar || hostInfo?.avatar!}
              alt={debate.host?.displayName || hostInfo?.displayName || debate.host?.handle || hostInfo?.handle || 'Host'}
              width={20}
              height={20}
              className="rounded-full sm:w-6 sm:h-6"
            />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm text-gray-200 font-medium truncate">
                {hostInfo?.displayName || debate.host?.displayName || (debate.host as any)?.name || (debate.host as any)?.Name || 'Host'}
              </span>
              <span className="text-xs sm:text-sm text-gray-400 truncate">
                @{hostInfo?.handle || debate.host?.handle || (debate.host as any)?.Handle || 'host'}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-900">
                {(hostInfo?.displayName || hostInfo?.handle || debate.hostId || 'H').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm text-gray-200 font-medium truncate">
                {hostInfo?.displayName || debate.host?.displayName || (debate.host as any)?.name || (debate.host as any)?.Name || 'Host'}
              </span>
              <span className="text-xs sm:text-sm text-gray-400 truncate">
                @{hostInfo?.handle || debate.host?.handle || (debate.host as any)?.Handle || 'host'}
              </span>
            </div>
          </>
        )}
        {debate.isAI && (
          <div className="ml-auto flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
            </svg>
          </div>
        )}
      </div>

      {/* Stats - Fixed height */}
      <div className="space-y-2 mb-3 sm:mb-4 min-h-14 sm:min-h-16">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-gray-500">{isRunning ? 'Participants' : 'Interested'}</span>
          <span className="text-gray-300 font-medium">{(debate.totalParticipants ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-gray-500">{isRunning ? 'Ends in' : 'Starts'}</span>
          <span
            className={`font-medium ${isRunning ? 'text-cyan-400' : 'text-gray-300'}`}
            suppressHydrationWarning
          >
            {isRunning && debate.endTime
              ? getTimeRemaining(debate.endTime).replace('Ends in ', '')
              : getStartTime(debate.startTime)
            }
          </span>
        </div>
        {!isRunning && debate.startTime && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Date & Time</span>
            <span className="text-gray-400 font-medium" suppressHydrationWarning>
              {new Date(debate.startTime).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        )}
      </div>

      {/* Notification Bell - Fixed height for alignment */}
      <div className="mb-3 sm:mb-4 h-8 sm:h-10 flex items-start">
        {!isRunning && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              addReminder(debate.id, debate.title);
              showToast('You\'ll be notified when this debate starts', 'success');
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors group"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-[11px] sm:text-xs text-gray-400 group-hover:text-cyan-400 transition-colors">Remind me 5 min before</span>
          </motion.button>
        )}
      </div>

      {/* Spacer to push buttons to bottom */}
      <div className="flex-grow"></div>

      {/* Action button */}
      {isLocked ? (
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            setShowLockModal(true);
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2 sm:py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Unlock Preview
        </motion.button>
      ) : isRunning ? (
        <motion.button
          onClick={handleJoin}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2 sm:py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-cyan-500 hover:bg-cyan-400 text-gray-900"
        >
          Join Debate
        </motion.button>
      ) : (
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            if (isRegistered) {
              if (onUnregister) {
                onUnregister(debate.id);
                showToast('Unregistered successfully', 'info');
              }
            } else {
              if (onRegister) {
                onRegister(debate.id);
                showToast('Registered! You\'ll be notified when it starts', 'success');
              }
            }
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-2 sm:py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${isRegistered
            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
            : 'bg-cyan-500 hover:bg-cyan-400 text-gray-900'
            }`}
        >
          {isRegistered ? 'Unregister' : 'Register'}
        </motion.button>
      )}

      {/* Join Debate Modal */}
      <JoinDebateModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSelectSide={handleSelectSide}
        debateTitle={debate.title}
      />

      {/* Lock Explainer Modal */}
      <LockExplainerModal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        unlockPhase={debate.unlockPhase}
      />
    </motion.div>
  );
};

